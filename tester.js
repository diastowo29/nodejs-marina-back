const sample = [{
    "products": {
        "id": 40,
        "origin_id": "801976400-14254225319",
        "product_img": []
    }
}]
const itemId = 801976400

console.log(sample.find((item) => item.products.origin_id.startsWith(itemId)).products)