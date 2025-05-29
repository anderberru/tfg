jest.mock('fs');

jest.mock('child_process', () => {
  const EventEmitter = require('events');

  return {
    exec: jest.fn((cmd, cb) => {
      if (cmd.includes('vagrant ssh')) {
        // Simulate a successful SSH command execution
        cb(null, 'SSH command executed successfully\n', '');
      } else if (cmd.includes('vagrant --version')) {
        cb(null, 'Vagrant 2.3.7\n', '');
      } else if (cmd.includes('VBoxManage')) {
        cb(null, '7.0.10r158379\n', '');
      } else {
        cb(new Error('not found'), '', 'not found');
      }
    }),
    spawn: jest.fn(() => {
      const mockProcess = new EventEmitter();
      mockProcess.stdout = new EventEmitter();
      mockProcess.stderr = new EventEmitter();

      // Controlled event emission inside the mock
      setImmediate(() => {
        mockProcess.stderr.emit('data', 'Simulated error\n');
        mockProcess.stdout.emit('data', 'Simulated output\n');
        mockProcess.emit('close', 0);
      });

      return mockProcess;
    }),
  };
});

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');
const { router } = require('../routes/index'); // adjust the path according to your file location
const multer = require('multer');
const os = require('os');
const { Readable } = require('stream');
const indexRoutes = require('../routes/index');


// Only simulate .emit without changing structure
beforeAll(() => {
  // Inject a mock object with emit
  indexRoutes.setSocket({ emit: jest.fn() });
});

const app = express();
app.use(express.json());
app.use('/', router); // mount your router

describe('Vagrant related routes', () => {

  describe('GET /checkTools', () => {
    it('should respond with dependency status', async () => {
      const res = await request(app).get('/checkTools');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('vagrant');
      expect(res.body.vagrant).toHaveProperty('installed', true);
      expect(res.body.vagrant).toHaveProperty('version');
      expect(res.body.vagrant.version).toEqual('Vagrant 2.3.7');
      expect(res.body).toHaveProperty('virtualbox');
      expect(res.body.virtualbox).toHaveProperty('installed', true);
      expect(res.body.virtualbox).toHaveProperty('version');
      expect(res.body.virtualbox.version).toEqual('7.0.10r158379');
    });
  });

  describe('POST /vagrantUp', () => {
    it('should simulate a vagrant up execution', async () => {
      const res = await request(app)
        .post('/vagrantUp')
        .send({ cluster: 'test', nodos: 3 })
        .expect(200);

      expect(res.body.message).toContain('VAGRANT UP PROCESS');
      expect(res.body.message).toContain('Simulated error');
      expect(res.body.message).toContain('Simulated output');
    });
  });

  describe('GET /vmList', () => {
    it('should return an empty list of virtual machines', async () => {
      const res = await request(app).get('/vmList');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("list");
      expect(Array.isArray(res.body.list)).toBe(true);
    });

    it('should return a list of virtual machines', async () => {
      const EventEmitter = require('events');

      require('child_process').spawn.mockImplementationOnce(() => {
        const mockProcess = new EventEmitter();
        mockProcess.stdout = new EventEmitter();
        mockProcess.stderr = new EventEmitter();

        setImmediate(() => {
          mockProcess.stdout.emit('data', 'firewall1 running\n');
          mockProcess.stdout.emit('data', 'firewall2 running\n');
          mockProcess.emit('close', 0);
        });

        return mockProcess;
      });

      const res = await request(app).get('/vmList');
      expect(res.statusCode).toBe(200);
      expect(res.body.list).toEqual([
        { name: 'firewall1', status: 'running' },
        { name: 'firewall2', status: 'running' }
      ]);
    });

  });

  describe('GET /vagrantDestroy', () => {
    it('should simulate a vagrant destroy execution', async () => {
      const res = await request(app).get('/vagrantDestroy');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('VAGRANT DESTROY PROCESS');
      expect(res.body.message).toContain('Simulated output');
      expect(res.body.message).toContain('Simulated error');
    });
  });

  describe('GET /vagrantHalt', () => {
    it('should simulate a vagrant halt execution', async () => {
      const res = await request(app).get('/vagrantHalt');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('VAGRANT HALT PROCESS');
      expect(res.body.message).toContain('Simulated output');
      expect(res.body.message).toContain('Simulated error');
    });
  });

  describe('POST /vagrantSsh', () => {
    it('should simulate a vagrant ssh execution', async () => {
      const res = await request(app)
        .post('/vagrantSsh')
        .send({ vm_name: 'firewall1' })
        .expect(200);

      expect(res.body.message).toContain('SSH command executed');
    });

    it('should give an error message', async () => {
      const { exec } = require('child_process');
      const execMock = jest.spyOn(require('child_process'), 'exec').mockImplementation((cmd, cb) => {
        cb(new Error('vagrant ssh error'), 'Mocked exec output', '');
      });
      const res = await request(app)
        .post('/vagrantSsh')
        .send({ aaaa: '' })
        .expect(500);

      expect(res.body.error).toContain('Failed to open terminal');
      execMock.mockRestore();
    });
  });

});

describe('Tests for file edits and uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /readParameters returns mocked data', async () => {
    const fakeJson = { test: 'ok' };

    fs.readFile.mockImplementation((path, encoding, callback) => {
      callback(null, JSON.stringify(fakeJson));
    });

    const res = await request(app).get('/readParameters');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(fakeJson);
  });

  it('POST /saveParameters saves JSON', async () => {
    fs.writeFile.mockImplementation((path, data, callback) => {
      callback(null);
    });

    const payload = { example: 'value' };

    const res = await request(app)
      .post('/saveParameters')
      .send(payload);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Parameters saved');
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('parameters.json'),
      JSON.stringify(payload, null, 2),
      expect.any(Function)
    );
  });

  it('POST /uploadFile uploads a file', async () => {
    jest.resetModules(); // Clear module cache so mocks take effect

    // Local mock for multer inside the test
    jest.doMock('multer', () => {
      return () => ({
        single: () => (req, res, next) => {
          req.file = {
            originalname: 'script.sh',
            path: '/fake/path/script.sh',
          };
          next();
        }
      });
    });

    // Also mock diskStorage in case the code uses it
    const multer = require('multer');
    multer.diskStorage = jest.fn(() => ({}));

    // Import app after mocks
    const app = require('../app');

    const res = await request(app)
      .post('/uploadFile')
      .attach('file', Readable.from(['file content']), {
        filename: 'script.sh',
        contentType: 'application/x-sh',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('File uploaded successfully');
  });

  it('POST /uploadFile returns error when file format is not sh', async () => {
    jest.resetModules(); // Clear module cache so mocks take effect

    // Local mock for multer inside the test
    jest.doMock('multer', () => {
      return () => ({
        single: () => (req, res, next) => {
          req.file = {
            originalname: 'script.txt',
            path: '/fake/path/script.txt',
          };
          next();
        }
      });
    });

    // Also mock diskStorage in case the code uses it
    const multer = require('multer');
    multer.diskStorage = jest.fn(() => ({}));

    // Import app after mocks
    const app = require('../app');

    const res = await request(app)
      .post('/uploadFile')
      .attach('file', Readable.from(['file content']), {
        filename: 'script.txt',
        contentType: 'application/x-sh',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Only .sh files are allowed');
  });


});
