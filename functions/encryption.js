const { createCipheriv, createDecipheriv, createHash } = require('node:crypto');
// require('dotenv').config();

const secret_key = process.env.M_SECRET_KEY || 'xxx'
const secret_iv = process.env.M_SECRET_IV || 'xxx'
const encryption_method = process.env.ENCRYPTION_METHOD || 'xxx'

if (!secret_key || !secret_iv || !encryption_method) {
  console.log(secret_key)
  throw new Error('secretKey, secretIV, and encryption_method are required')
}

// Generate secret hash with crypto to use for encryption
const key = createHash('sha512')
  .update(secret_key)
  .digest('hex')
  .substring(0, 32)
const encryptionIV = createHash('sha512')
  .update(secret_iv)
  .digest('hex')
  .substring(0, 16)

// Encrypt data
function encryptData(data) {
  const cipher = createCipheriv(encryption_method, key, encryptionIV)
  return Buffer.from(
    cipher.update(data, 'utf8', 'hex') + cipher.final('hex')
  ).toString('base64') // Encrypts data and converts to hex and base64
}

// Decrypt data
function decryptData(encryptedData) {
  const buff = Buffer.from(encryptedData, 'base64')
  const decipher = createDecipheriv(encryption_method, key, encryptionIV)
  return (
    decipher.update(buff.toString('utf8'), 'hex', 'utf8') +
    decipher.final('utf8')
  ) // Decrypts data and converts to utf8
}

module.exports = {
  encryptData,
  decryptData
}