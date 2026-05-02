import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';
import { decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as nsfwjs from 'nsfwjs';
import { Buffer } from 'buffer';

class ImageSafetyService {
  private model: nsfwjs.NSFWJS | null = null;
  private isInitializing: boolean = false;

  /**
   * 初始化并加载 nsfwjs 模型
   */
  async init() {
    if (this.model) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    try {
      console.log('[ImageSafety] Initializing TensorFlow...');
      await tf.ready();
      
      console.log('[ImageSafety] Loading nsfwjs model...');
      // 默认会从云端加载量化版 MobileNetV2 模型 (约 2.6MB)
      // MobileNetV2 应该使用 LayersModel 加载，而不是 GraphModel
      this.model = await nsfwjs.load('https://raw.githubusercontent.com/infinitered/nsfwjs/master/models/mobilenet_v2/model.json', { size: 224 });
      console.log('[ImageSafety] Model loaded successfully');
    } catch (error) {
      console.error('[ImageSafety] Failed to initialize:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * 检查图片内容是否安全
   * @param imageUri 本地图片的 URI
   * @returns boolean - true 表示安全，false 表示可能包含违规内容
   */
  async checkImageSafety(imageUri: string): Promise<boolean> {
    try {
      // 1. 确保模型已加载
      if (!this.model) {
        await this.init();
      }
      
      if (!this.model) {
        console.warn('[ImageSafety] Model not available, bypassing check.');
        return true; // 模型加载失败时，保守起见允许放行，以免阻塞正常使用
      }

      console.log('[ImageSafety] Checking image:', imageUri);

      // 如果图片不是 jpeg 格式，将其转换为 jpeg (decodeJpeg 仅支持 jpeg 数据)
      let processedUri = imageUri;
      const lowerUri = imageUri.toLowerCase();
      if (!lowerUri.endsWith('.jpg') && !lowerUri.endsWith('.jpeg')) {
        const manipResult = await ImageManipulator.manipulateAsync(
          imageUri,
          [],
          { format: ImageManipulator.SaveFormat.JPEG, compress: 1 }
        );
        processedUri = manipResult.uri;
      }

      // 2. 将本地图片读取为 Base64
      const base64Data = await FileSystem.readAsStringAsync(processedUri, {
        encoding: 'base64' as any,
      });

      // 3. 将 Base64 转换为 Uint8Array
      const buffer = Buffer.from(base64Data, 'base64');
      const uint8Array = new Uint8Array(buffer);

      // 4. 将图片数据解码为 TensorFlow Tensor
      const imageTensor = decodeJpeg(uint8Array);

      // 5. 进行预测
      const predictions = await this.model.classify(imageTensor as any);
      
      // 释放内存
      tf.dispose(imageTensor);

      console.log('[ImageSafety] Predictions:', predictions);

      // 6. 判断逻辑：降低阈值，并将 Porn、Hentai、Sexy 都纳入不安全范畴
      const threshold = 0.5; // 如果单项概率超过 50%，则直接判定违规
      const isUnsafe = predictions.some(
        (p) => (p.className === 'Porn' || p.className === 'Hentai' || p.className === 'Sexy') && p.probability > threshold
      );

      // 可选的更严格策略：如果 (Porn + Sexy + Hentai) 的累计概率超过 60%
      const unsafeTotalProb = predictions
        .filter((p) => ['Porn', 'Hentai', 'Sexy'].includes(p.className))
        .reduce((sum, p) => sum + p.probability, 0);
      
      const finalDecision = isUnsafe || unsafeTotalProb > 0.6;
      
      if (finalDecision) {
        console.warn(`[ImageSafety] Image rejected. Unsafe items max prob: ${isUnsafe}, total unsafe prob: ${unsafeTotalProb}`);
      }

      return !finalDecision;
    } catch (error) {
      console.error('[ImageSafety] Error checking image:', error);
      // 发生错误时，为了不影响核心体验，默认放行
      return true;
    }
  }
}

export default new ImageSafetyService();
