var express = require('express');
var router = express.Router();
router.post('/hook', async function (req, res, next) {
    console.log(JSON.stringify(req.body));
    
    res.status(200).send(client);
});

module.exports = router;