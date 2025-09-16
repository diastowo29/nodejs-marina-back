// const { decryptData, encryptData } = require('./functions/encryption');
// const { PrismaClient: prismaBaseClient } = require('./prisma/generated/baseClient');


async function testAll() {
    let a = [1,2,6]
    let arr = [];
    a.forEach(i => {
        arr.push(delayedResponse(i))
    });
    const b = await Promise.all(arr);
    console.log(b)
}

function delayedResponse(i) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, (i * 1000));
    console.log(i)
    return i
  });
}

testAll();