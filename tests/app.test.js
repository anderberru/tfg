

jest.mock('fs');
jest.mock('child_process', () => {
  const EventEmitter = require('events');

  return {
    exec: jest.fn((cmd, cb) => {
      if (cmd.includes('vagrant')) {
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

      // Emisión de eventos controlada dentro del mock
      setImmediate(() => {
        mockProcess.stdout.emit('data', 'Simulando salida\n');
        mockProcess.stderr.emit('data', 'Simulando error\n');
        mockProcess.emit('close', 0);
      });

      return mockProcess;
    }),
  };
});




const fs = require('fs');
const request = require('supertest');
const express = require('express');
const { router } = require('../routes/index'); // ajusta la ruta según dónde esté tu archivo

const indexRoutes = require('../routes/index');

// Simular solo el .emit sin cambiar estructura
beforeAll(() => {
  // Injectamos un objeto simulado con emit
  indexRoutes.setSocket({ emit: jest.fn() });
});


const app = express();
app.use(express.json());
app.use('/', router); // monta tu router

describe('Vagrant related routes', () => {

  it('GET /checkTools debería responder con estado de dependencias', async () => {
    const res = await request(app).get('/checkTools');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('vagrant');
    expect(res.body).toHaveProperty('virtualbox');
  });

  it('POST /vagrantUp debería simular una ejecución de vagrant up', async () => {
    const res = await request(app)
      .post('/vagrantUp')
      .send({ cluster: 'test', nodos: 3 })
      .expect(200);

    expect(res.body.message).toContain('VAGRANT UP PROCESS');
    expect(res.body.message).toContain('Simulando error');
    expect(res.body.message).toContain('Simulando salida');
  });



});

describe('Tests para /readParameters y /saveParameters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('GET /readParameters devuelve datos simulados', async () => {
    const fakeJson = { test: 'ok' };

    fs.readFile.mockImplementation((path, encoding, callback) => {
      callback(null, JSON.stringify(fakeJson));
    });

    const res = await request(app).get('/readParameters');
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(fakeJson);
  });

  test('POST /saveParameters guarda JSON', async () => {
    fs.writeFile.mockImplementation((path, data, callback) => {
      callback(null);
    });

    const payload = { ejemplo: 'valor' };

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
});


