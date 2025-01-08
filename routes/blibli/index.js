var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const {workQueue, jobOpts} = require('../../config/redis.config');
const { BLIBLI } = require('../../config/utils');

const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res
        .status(200)
        .send({});
});

router.post('/webhook', async function (req, res, next) {
    // console.log(req.body);
    workQueue.add({
        channel: BLIBLI,
        body: req.body
    }, jobOpts);
    res
        .status(200)
        .send({});
});

const sample = {
    "recipient": {
        "city": "Kota Jakarta Pusat",
        "country": "ID",
        "disctrict": "Gambir",
        "latitude": -6.179189042070847,
        "longitude": 106.82087546140129,
        "name": "Jane",
        "state": "DKI Jakarta",
        "streetAddress": "Jl. Budi Kemulyaan No. 1 RT.1/RW.1, Gambir, Jakarta Pusat, 10101, Indonesia",
        "subDistrict": "Gambir",
        "zipCode": 10101
    },
    "store": {
        "code": "TOQ-15126",
        "commissionType": "CM",
        "deliveryType": "PICKUP",
        "name": "Toko ABC"
    },
    "orderItems": [
        {
            "adjustment": [
                {
                    "amount": -10000,
                    "code": "DISC_TOKO_ANDALAN",
                    "description": "THE GENEROUS TOKO ANDALAN",
                    "merchantMargin": 5000,
                    "name": "Discount Toko Andalan",
                    "type": "MERCHANT_VOUCHER"
                }
            ],
            "amount": {
                "itemAmount": 9000,
                "itemTotalAmount": 120000,
                "paymentFee": 100,
                "sellerAmount": 110000,
                "shippingCost": 1500,
                "shippingInsuranceCost": 10000
            },
            "flags": {
                "cashOnDelivery": false,
                "fulfilledByBlibli": false,
                "instantPickup": true
            },
            "orderItem": {
                "id": "121072766613",
                "packageCreated": true,
                "packageId": "10025702"
            },
            "product": {
                "blibliSku": "TOQ-15126-00298-00001",
                "initialQuantity": 10,
                "itemPrice": 15750,
                "name": "Samsung S20",
                "notes": "Please wrap it safely",
                "quantity": 7,
                "sellerSku": "SAMS-SKU-01",
                "type": "1"
            },
            "shipment": {
                "logisticOptionCode": "Regular",
                "logisticOptionName": "Regular",
                "logisticProductCode": "RegularCode",
                "logisticProductName": "Regular",
                "notes": null,
                "shippingEtdMax": 1640192340000,
                "shippingEtdMin": 1640152800000,
                "totalWeight": 2
            },
            "storePickupPoint": {
                "city": "Kota Jakarta Selatan",
                "code": "PP-3003332",
                "country": "ID",
                "district": "Cilandak",
                "latitude": -6.170340200000001,
                "longitude": 106.8148046,
                "name": "Pickup point A",
                "picName": "Aris",
                "picPhone": 6221555555,
                "sellerPickupPointCode": "Warehouse-1",
                "state": "Indonesia",
                "streetAddress": "Jl. Kemang Raya, No. 12",
                "subdistrict": "Gambir",
                "warehouseCode": "PP-5129123",
                "warehouseName": "Warehouse-A",
                "zipCode": "12560"
            }
        }
    ],
    "timestamp": 1537149303013,
    "order": {
        "fpDate": 1563967229068,
        "id": "12104566234",
        "status": "FP",
        "type": "B2C_RETAIL"
    }
}

module.exports = router;
