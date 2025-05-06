var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const { exec, spawn } = require('child_process');
const kill = require('tree-kill');

const vagrantPath = path.join(__dirname, '..', 'vagrant');

let vagrantUp = null;

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
  
  vagrantUp = spawn('vagrant', ['up'], { cwd: vagrantPath });

  let output = '';

  vagrantUp.stdout.on('data', (data) => {
    line = data.toString();
    output += line; // acumulamos la salida
    console.log(`${line.trim()}`);
  });

  vagrantUp.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  vagrantUp.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    vagrantUp = null; // Limpiamos la variable para que pueda ser reiniciada
    console.log('Proceso vagrant up terminado');
    res.json({ message: 'Cluster created' });
  });

});

router.get('/vmList', function(req, res, next) {

  console.log('vmList endpoint hit');
  const command = spawn('vagrant', ['status'], { cwd: vagrantPath });
  let vmList = [];
  let output = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    output += line; // acumulamos la salida
    vmList.push(line);
    console.log(`${line.trim()}`);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    console.log('Proceso vagrant status terminado');
    const vmjson = vmList_to_json(lines);
    
    res.json({ message: 'Proceso vagrant status terminado' });
  });
});

function vmList_to_json(vmList) {
  const json = [];
  const vmRegex = /^([^\s]+)\s+(running|poweroff|saved|aborted|not created|inaccessible)/;

  vmList.forEach((line) => {
    const match = line.trim().match(vmRegex);
    if (match) {
      const name = match[1];
      const status = match[2];
      json.push({ name, status });
    }
  });

  console.log('JSON:', json);
  return json;
}


router.get('/cancelVagrantUp', (req, res) => {
  if (vagrantUp) {
    kill(vagrantUp.pid, 'SIGKILL', (err) => {
      if (err) {
        console.error('Error al matar proceso:', err);
        res.status(500).json({ message: 'No se pudo detener vagrant up' });
      } else {
        console.log('Proceso vagrant up cancelado');
        vagrantUp = null;
        res.json({ message: 'vagrant up cancelado' });
      }
    });
  } else {
    res.status(400).json({ message: 'No hay proceso activo' });
  }
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
    console.log('Proceso vagrant destroy terminado');
    res.json({ message: 'Everything was destroyed' });
  });

});

router.get('/vagrantHalt', function(req, res, next) {
  console.log('vagrantHalt endpoint hit');
  
  const command = spawn('vagrant', ['halt'], { cwd: vagrantPath });

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
    console.log('Proceso vagrant halt terminado');
    res.json({ message: 'Cluster stopped' });
  });

});

module.exports = router;
