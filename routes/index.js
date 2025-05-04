var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');

const vagrantPath = path.join(__dirname, '..', 'vagrant');

function writeJsonFile(filePath, data) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('JSON file has been saved.');
    }
  });
}

/* GET home page. */
router.get('/', function(req, res, next) {
  //res.render('index', { title: 'Express' });
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

router.post('/vagrantUp', function(req, res, next) {
  console.log('vagrantUp endpoint hit');
  writeJsonFile(path.join(vagrantPath, 'parameters.json'), req.body);
  //console.log('Vagrant path:', vagrantPath);
  
  const command = spawn('vagrant', ['up'], { cwd: vagrantPath });

  let output = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    output += line; // acumulamos la salida
    console.log(`${line.trim()}`);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    res.json({ message: 'Cluster created' });
  });


});

router.get('/vagrantDestroy', function(req, res, next) {
  console.log('vagrantDestroy endpoint hit');
  
  const command = spawn('vagrant', ['destroy', '-f'], { cwd: vagrantPath });

  let output = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    output += line; // acumulamos la salida
    console.log(`${line.trim()}`);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    res.json({ message: 'Everything was destroyed' });
  });

});

module.exports = router;
