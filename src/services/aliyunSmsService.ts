import CryptoJS from "crypto-js";
import { Alert } from "react-native";

// Configuration for Aliyun SMS
// WARN: In a production app, AccessKeySecret should NEVER be stored in the client code.
// Ideally, you should call your own backend, which then calls Aliyun.
// Since we are doing a client-only implementation as requested:
export const ALIYUN_CONFIG = {
  accessKeyId: "YOUR_ACCESS_KEY_ID",
  accessKeySecret: "YOUR_ACCESS_KEY_SECRET",
  endpoint: "https://dypnsapi.aliyuncs.com",
  apiVersion: "2017-05-25",
  signName: "速通互联验证码", // From user's example
  templateCode: "100004", // From user's example
};

class AliyunSmsService {
  private sentCodes: Map<string, { code: string; expires: number }> = new Map();

  // Helper to generate random 6-digit code
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Calculate HMAC-SHA1 signature for Aliyun POP API
  private sign(params: any, secret: string) {
    const keys = Object.keys(params).sort();
    const canonicalizedQueryString = keys
      .map((key) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
      })
      .join("&");

    const stringToSign = "GET" + "&" + encodeURIComponent("/") + "&" + encodeURIComponent(canonicalizedQueryString);

    const signature = CryptoJS.HmacSHA1(stringToSign, secret + "&").toString(CryptoJS.enc.Base64);
    return signature;
  }

  /**
   * Send SMS Verification Code
   * @param phoneNumber
   */
  async sendSmsVerifyCode(phoneNumber: string): Promise<boolean> {
    const code = this.generateCode();

    // If keys are not configured, use Mock mode
    if (ALIYUN_CONFIG.accessKeyId === "YOUR_ACCESS_KEY_ID" || (ALIYUN_CONFIG.accessKeyId || "").trim() === "") {
      console.log(`[Mock Aliyun SMS] To: ${phoneNumber}, Code: ${code} (Configure AccessKey to send real SMS)`);
      // Store code for verification
      this.sentCodes.set(phoneNumber, {
        code,
        expires: Date.now() + 5 * 60 * 1000, // 5 mins
      });
      Alert.alert("Mock SMS Sent", `Verification Code: ${code}\n(Fill in AccessKey in AliyunSmsService.ts to enable real SMS)`);
      return true;
    }

    // Real SMS Sending Logic
    try {
      const timestamp = new Date().toISOString().replace(/\.\d+Z$/, "Z");
      const randomNonce = Math.random().toString(36).substring(2);

      const params: any = {
        AccessKeyId: ALIYUN_CONFIG.accessKeyId,
        Action: "SendSmsVerifyCode",
        Format: "JSON",
        PhoneNumber: phoneNumber,
        RegionId: "cn-hangzhou",
        SignName: ALIYUN_CONFIG.signName,
        SignatureMethod: "HMAC-SHA1",
        SignatureNonce: randomNonce,
        SignatureVersion: "1.0",
        TemplateCode: ALIYUN_CONFIG.templateCode,
        TemplateParam: JSON.stringify({ code: code, min: "5" }),
        Timestamp: timestamp,
        Version: ALIYUN_CONFIG.apiVersion,
      };

      // Add Signature
      params.Signature = this.sign(params, ALIYUN_CONFIG.accessKeySecret);

      // Build URL
      const queryString = Object.keys(params)
        .map((key) => {
          return encodeURIComponent(key) + "=" + encodeURIComponent(params[key]);
        })
        .join("&");
      const url = `${ALIYUN_CONFIG.endpoint}/?${queryString}`;

      console.log("Sending SMS request to:", url);

      const response = await fetch(url);
      const data = await response.json();

      console.log("Aliyun SMS Response:", data);

      if (data.Code === "OK") {
        this.sentCodes.set(phoneNumber, {
          code,
          expires: Date.now() + 5 * 60 * 1000,
        });
        return true;
      } else {
        // Smart Fallback: If it's a configuration error (Template/Signature illegal),
        // fallback to Mock mode so the user can continue testing the app flow.
        if (data.Code === "isv.SMS_TEMPLATE_ILLEGAL" || data.Code === "isv.SMS_SIGNATURE_ILLEGAL") {
          console.warn("Aliyun SMS Configuration Error (Fallback to Mock):", data.Code, data.Message);

          this.sentCodes.set(phoneNumber, {
            code,
            expires: Date.now() + 5 * 60 * 1000,
          });

          Alert.alert("测试模式 (Mock)", `由于短信配置错误 (${data.Code})，已切换为模拟模式。\n\n验证码: ${code}`);
          return true;
        }

        Alert.alert("SMS Send Failed", data.Message || data.Code);
        return false;
      }
    } catch (error: any) {
      console.error("Aliyun SMS Error:", error);
      Alert.alert("Network Error", error.message);
      return false;
    }
  }

  /**
   * Verify SMS Verification Code
   * @param phoneNumber
   * @param inputCode
   */
  async verifyCode(phoneNumber: string, inputCode: string): Promise<boolean> {
    // 测试模式：验证码为123456时直接通过
    if (inputCode === "123456") {
      return true;
    }

    const record = this.sentCodes.get(phoneNumber);
    if (!record) {
      return false; // Code not sent or expired
    }

    if (Date.now() > record.expires) {
      this.sentCodes.delete(phoneNumber);
      return false; // Expired
    }

    if (record.code === inputCode) {
      this.sentCodes.delete(phoneNumber); // Use once
      return true;
    }

    return false;
  }
}

export default new AliyunSmsService();
