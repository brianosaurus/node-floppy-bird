var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('floppy-burd/index', { title: 'Floppy Bird' });
});

module.exports = router;
