// const { decryptData, encryptData } = require('./functions/encryption');
// const { PrismaClient: prismaBaseClient } = require('./prisma/generated/baseClient');
const testing = "SEND_PRODUCT: 123\ntesting\ntesting"

async function testAll() {
  const productId = testing.split('\n')[0].split(': ')[1]
  console.log(productId);

    /* let a = [1,2,6]
    let arr = [];
    a.forEach(i => {
        arr.push(delayedResponse(i))
    });
    const b = await Promise.all(arr);
    console.log(b) */
}

/* function delayedResponse(i) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, (i * 1000));
    console.log(i)
    return i
  });
} */

testAll();