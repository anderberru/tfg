var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

router.get('/vagrantUp', function(req, res, next) {
  console.log('vagrantUp endpoint hit');
  const vagrantPath = path.join(__dirname, '..', 'vagrant');
  console.log('Vagrant path:', vagrantPath);
  const ls = spawn('vagrant', ['up'], { cwd: vagrantPath });

  let output = '';

  ls.stdout.on('data', (data) => {
    output += data.toString(); // acumulamos la salida
    console.log(`${data}`);
  });

  ls.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  ls.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    res.json({ message: 'API is working!' });
  });


});

module.exports = router;
