const { Item } = require('sunshine-conversations-client');
const { BLIBLI } = require('../../config/utils');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const { PrismaClient } = require('../../prisma/generated/client');
let mPrisma = new PrismaClient();

async function processBlibli (jsonBody, prisma, org) {
    mPrisma = prisma;
    // const taskPayload = {};
    try {
        if (jsonBody.product) {
            // call blibli API to get product detail
            /* return mPrisma.products.upsert({
                where: {
                    origin_id: jsonBody.product.code
                },
                create: {
                    origin_id: jsonBody.product.code,
                    sku: jsonBody.product.sku,
                    name: jsonBody.variants[0].name,
                    price: jsonBody.variants[0].pickupPoints[0].price,
                    pre_order: jsonBody.flags.preOrder,
                    store: {
                        connect: {
                            origin_id: jsonBody.store.code
                        }
                    },
                    varian: {
                        createMany: {
                            skipDuplicates: true,
                            data: jsonBody.variants.map(variant => ({
                                name: variant.name,
                                origin_id: variant.blibliSku,
                                price: variant.pickupPoints[0].price,
                                sku: variant.sellerSku,
                                pre_order: false,
                            }))
                        }
                    }
                },
                update: {
                    name: jsonBody.variants[0].name,
                    price: jsonBody.variants[0].pickupPoints[0].price,
                },
                select: {
                    id: true,
                }
            }) */
            const products = await mPrisma.products.createMany({
                skipDuplicates: true,
                data: jsonBody.variants.map(variant => ({
                    origin_id: variant.blibliSku,
                    sku: `${jsonBody.product.code}:${jsonBody.product.sku}:${variant.sellerSku}`,
                    name: variant.name,
                    price: variant.pickupPoints[0].price,
                    pre_order: jsonBody.flags.preOrder,
                    storeId: jsonBody.marinaStoreId
                }))
            });
            return {done: true, product: products};
        } else if (jsonBody.order) {
            let itemPriceTotal = 0;
            let shipTotal = 0;
            let shipInsuranceTotal = 0;
            jsonBody.orderItems.forEach(oItem => {
                itemPriceTotal = itemPriceTotal + oItem.amount.itemTotalAmount;
                shipTotal = shipTotal + oItem.amount.shippingCost;
                shipInsuranceTotal = shipInsuranceTotal + oItem.amount.shippingInsuranceCost;
            });
    
            const order = await mPrisma.orders.create({
                data: {
                    store: {
                        connect: {
                            origin_id: jsonBody.store.code
                        }
                    },
                    origin_id: jsonBody.order.id,
                    status: jsonBody.order.status,
                    recp_name: jsonBody.recipient.name,
                    recp_addr_province: jsonBody.recipient.state || '-',
                    recp_addr_postal_code: jsonBody.recipient.zipCode || '-',
                    recp_addr_district: jsonBody.recipient.district || '-',
                    recp_addr_full: jsonBody.recipient.streetAddress || '-',
                    recp_addr_city: jsonBody.recipient.city || '-',
                    recp_addr_country: jsonBody.recipient.country || '-',
                    order_items: {
                        create: jsonBody.orderItems.map(oItem => ({
                            qty: oItem.product.quantity,
                            total_price: oItem.amount.itemTotalAmount,
                            invoice: jsonBody.order.id,
                            notes: oItem.product.notes || '-',
                            origin_id: oItem.orderItem.id,
                            package_id: oItem.orderItem.packageId,
                            products: {
                                connectOrCreate: {
                                    where: {
                                        origin_id: oItem.product.blibliSku
                                    },
                                    create: {
                                        origin_id: oItem.product.blibliSku,
                                        name: oItem.product.name,
                                        price: oItem.product.itemPrice

                                    }
                                }
                            }
                        }))
                    },
                    shipping_price: shipTotal,
                    total_product_price: itemPriceTotal,
                    item_insurance_fee: shipInsuranceTotal
                }
            });
            return {done: true, order: order}
        }
    } catch (error) {
        throw new Error(error);
    }
    
    // return taskPayload;
}

module.exports = {
    processBlibli
}