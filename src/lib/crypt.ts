import bcrypt from "bcrypt";

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
