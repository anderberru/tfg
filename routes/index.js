var express = require('express');
var router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { exec, spawn } = require('child_process');
const kill = require('tree-kill');
//const { io } = require('../app');

let io;
function setSocket(socketIO) {
  io = socketIO;
};

const vagrantPath = path.join(__dirname, '..', 'vagrant');

let vagrantUp = null;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(vagrantPath, 'scripts', 'custom');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Usar el nombre original
  }
});

const upload = multer({ storage });

function writeJsonFile(filePath, data) {
  fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
    if (err) {
      console.error('Error writing file:', err);
    } else {
      console.log('JSON file has been saved.');
    }
  });
}

// Función para detectar una terminal disponible en Linux
function getLinuxTerminal() {
  const terminals = ['gnome-terminal', 'konsole', 'xfce4-terminal', 'xterm'];
  for (const term of terminals) {
    try {
      execSync(`which ${term}`, { stdio: 'ignore' });
      return term;
    } catch (_) {
      // No encontrada, probamos con la siguiente
    }
  }
  return null;
}

function checkProgramInstalled(command, name) {
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`${name} not found:`, stderr.trim());
        resolve({ name, installed: false });
      } else {
        console.log(`${name} found:`, stdout.trim());
        resolve({ name, installed: true, version: stdout.trim() });
      }
    });
  });
}

async function checkDependencies() {
  const vagrant = await checkProgramInstalled('vagrant --version', 'Vagrant');
  const virtualbox = await checkProgramInstalled('VBoxManage --version', 'VirtualBox');

  return { vagrant: vagrant, virtualbox: virtualbox };
}

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

router.get('/checkTools', async (req, res) => {
  const status = await checkDependencies();
  res.json(status);
});

router.post('/vagrantSsh', function(req, res, next) {
  const vmName = req.body.vm_name;
  let command = '';

  if (process.platform === 'win32') {
    // Windows
    command = `start cmd /k "cd /d ${vagrantPath} && vagrant ssh ${vmName}"`;
  } else if (process.platform === 'linux') {
      // Linux
      const terminal = getLinuxTerminal();

      if (!terminal) {
        return res.status(500).json({ error: 'No supported terminal found on Linux.' });
      }

      command = `${terminal} -- bash -c "cd '${vagrantPath}' && vagrant ssh ${vmName}; bash"`;
  } else if (process.platform === 'darwin') {
    // macOS
    command = `osascript -e 'tell app "Terminal" to do script "cd ${vagrantPath} && vagrant ssh ${vmName}"'`;

  } else {
    return res.status(500).json({ error: 'Unsupported platform' });
  }

  exec(command, (err) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Failed to open terminal' });
    } else {
      console.log('Terminal abierta y ejecutando el comando');
      return res.json({ message: 'SSH command executed' });
    }
  });

});

router.post('/saveParameters', function(req, res, next) {
  console.log('saveParameters endpoint hit');
  writeJsonFile(path.join(vagrantPath, 'parameters.json'), req.body);
  res.json({ message: 'Parameters saved' });
}
);

router.get('/readParameters', function(req, res, next) {
  console.log('getParameters endpoint hit');
  const filePath = path.join(vagrantPath, 'parameters.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      res.status(500).json({ error: 'Error reading parameters' });
    } else {
      try {
        const jsonData = JSON.parse(data);
        res.json(jsonData);
      } catch (parseErr) {
        console.error('Error parsing JSON:', parseErr);
        res.status(500).json({ error: 'Error parsing parameters' });
      }
    }
  });
});

router.post('/vagrantUp', function (req, res, next) {
  try {
    console.log('vagrantUp endpoint hit');

    writeJsonFile(path.join(vagrantPath, 'parameters.json'), req.body);

    const vagrantUp = spawn('vagrant', ['up'], { cwd: vagrantPath });
    io.emit('vagrant-output', 'Starting vagrant up...\n');

    let output = '';

    vagrantUp.stdout.on('data', (data) => {
      const line = data.toString();
      output += line;
      console.log(line.trim());
      io.emit('vagrant-output', line);
    });

    vagrantUp.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
      output += 'stderr: ' + data.toString();
      io.emit('vagrant-output', data.toString());
    });

    vagrantUp.on('close', (code) => {
      const lines = output.trim().split('\n');
      console.log('Proceso vagrant up terminado');
      io.emit('vagrant-output', output);
      io.emit('process-complete', 'Vagrant up process finished');

      output = "VAGRANT UP PROCESS:\n" + output + "\n";
      try {
        res.json({ message: output });
      } catch (err) {
        console.error('Error enviando la respuesta:', err);
        res.status(500).json({ error: 'Error enviando la respuesta final' });
      }
    });

  } catch (err) {
    console.error('Error general en /vagrantUp:', err);
    res.status(500).json({ error: 'Error ejecutando /vagrantUp' });
  }
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
    
    res.json({ list: vmjson });
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
  io.emit('process-start', 'Destroying vagrant...');

  let output = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    output += line; // acumulamos la salida
    console.log(`${line.trim()}`);
    io.emit('vagrant-output', line);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    output += 'stderr: ' + data.toString(); // acumulamos la salida
    io.emit('vagrant-output', data.toString());
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    console.log('Proceso vagrant destroy terminado');
    io.emit('process-complete', 'Vagrant destroy process finished');
    output = "VAGRANT DESTROY PROCESS:\n" + output + "\n";
    res.json({ message: output });
  });

});

router.get('/vagrantHalt', function(req, res, next) {
  console.log('vagrantHalt endpoint hit');
  
  const command = spawn('vagrant', ['halt'], { cwd: vagrantPath });
  io.emit('process-start', 'Halting vagrant...');

  let output = '';

  command.stdout.on('data', (data) => {
    line = data.toString();
    output += line; // acumulamos la salida
    console.log(`${line.trim()}`);
    io.emit('vagrant-output', line);
  });

  command.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
    output += 'stderr: ' + data.toString(); // acumulamos la salida
    io.emit('vagrant-output', data.toString());
  });

  command.on('close', (code) => {
    const lines = output.trim().split('\n');
    //console.log('Lista de archivos:', lines);
    console.log('Proceso vagrant halt terminado');
    io.emit('process-complete', 'Vagrant halt process finished');
    output = "VAGRANT HALT PROCESS:\n" + output + "\n";
    res.json({ message: output });
  });

});


router.post('/uploadFile', upload.single('file'), function (req, res) {
  console.log('uploadFile endpoint hit');
  console.log('Archivo recibido:', req.file);

  if (!req.file) {
    return res.status(400).json({ error: 'No se recibió ningún archivo.' });
  }

  return res.json({ message: 'File uploaded successfully' });
});

module.exports = { router, setSocket };
