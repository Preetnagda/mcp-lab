import bcrypt from "bcrypt";
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';
import { Resource } from "sst/resource";

/**
 * Hashes a string value using bcrypt with a salt round of 15.
 * @param value - The string to hash.
 * @returns The hashed string.
 */
export const hashWithSalt = async (value: string): Promise<string> => {
	return await bcrypt.hash(value, 15);
}

/**
 * Compares a plain string with a hashed string to check if they match.
 * @param plainString - The plain text string.
 * @param hashedString - The hashed string to compare against.
 * @returns True if the strings match, false otherwise.
 */
export const compareWithHash = async (plainString: string, hashedString: string): Promise<boolean> => {
	return await bcrypt.compare(plainString, hashedString);
}


const ENCRYPTION_KEY = Resource.ENCRYPTION_KEY.value;
const IV_LENGTH = 16;

const getFixedKey = (key: string) => {
    return createHash('sha256').update(String(key)).digest();
};

export const encrypt = (text: string): string => {
  // Ensure key is 32 bytes
  const key = getFixedKey(ENCRYPTION_KEY);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  // Format: iv:authTag:encryptedContent
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (text: string): string => {
  const [ivPart, authTagPart, encryptedPart] = text.split(':');
  if (!ivPart || !authTagPart || !encryptedPart) throw new Error('Invalid encrypted text format');
  
  // Ensure key is 32 bytes
  const key = getFixedKey(ENCRYPTION_KEY);
  const iv = Buffer.from(ivPart, 'hex');
  const authTag = Buffer.from(authTagPart, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encryptedPart, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};
