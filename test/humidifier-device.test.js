const assert = require('node:assert/strict');
const test = require('node:test');

const HumidifierDevice = require('../lib/modules/humidifier/HumidifierDevice.js');
const MiotDevice = require('../lib/protocol/MiotDevice.js');

const noopLogger = {
  info() {}, warn() {}, error() {}, debug() {}, deepDebug() {}, table() {}
};

function addProperty(device, name, spec) {
  device.addPropertyByString(name, JSON.stringify(spec));
  return device.getProperty(name);
}

function addP1200StyleProperties(miotDevice) {
  addProperty(miotDevice, 'humidifier:on', {
    siid: 2, piid: 1, type: 'urn:miot-spec-v2:property:on:00000006:xiaomi-p1200:1', description: 'On', format: 'bool', access: ['read', 'write', 'notify']
  });
  addProperty(miotDevice, 'humidifier:target-humidity', {
    siid: 2, piid: 4, type: 'urn:miot-spec-v2:property:target-humidity:00000022:xiaomi-p1200:1', description: 'Target Humidity', format: 'uint8', access: ['read', 'write', 'notify'], valueRange: [40, 70, 1]
  });
  addProperty(miotDevice, 'filter:filter-life-level', {
    siid: 8, piid: 1, type: 'urn:miot-spec-v2:property:filter-life-level:0000001E:xiaomi-p1200:1', description: 'Filter Life Level', format: 'uint8', access: ['read', 'notify'], valueRange: [0, 100, 1]
  });
  addProperty(miotDevice, 'dm-service:water-level', {
    siid: 6, piid: 7, type: 'urn:xiaomi-spec:property:water-level:00000007:xiaomi-p1200:1', description: 'water-level', format: 'uint8', access: ['read', 'notify'], unit: 'percentage',
    valueList: [{ value: 0, description: '0' }, { value: 50, description: '50' }, { value: 100, description: '100' }]
  });
  miotDevice.addActionByString('filter:reset-filter-life', JSON.stringify({
    siid: 8, aiid: 1, type: 'urn:miot-spec-v2:action:reset-filter-life:00002803:xiaomi-p1200:1', description: 'Reset Filter Life', in: [], out: []
  }));
}

function createP1200StyleHumidifier() {
  const miotDevice = new MiotDevice('192.168.0.10', 'token', 'device-id', 'xiaomi.humidifier.p1200', 'Test humidifier', noopLogger);
  addP1200StyleProperties(miotDevice);
  const device = new HumidifierDevice(miotDevice, 'Test humidifier', noopLogger);
  return { device, miotDevice };
}

function createRangeWaterLevelHumidifier() {
  const miotDevice = new MiotDevice('192.168.0.11', 'token', 'device-id2', 'zhimi.humidifier.ca1', 'Test humidifier 2', noopLogger);
  addProperty(miotDevice, 'humidifier:on', {
    siid: 2, piid: 1, type: 'urn:miot-spec-v2:property:on:00000006:zhimi-ca1:1', description: 'On', format: 'bool', access: ['read', 'write', 'notify']
  });
  addProperty(miotDevice, 'humidifier:water-level', {
    siid: 2, piid: 3, type: 'urn:miot-spec-v2:property:water-level:0000003D:zhimi-ca1:1', description: 'Water Level', format: 'uint8', access: ['read', 'notify'], valueRange: [0, 127, 1]
  });
  const device = new HumidifierDevice(miotDevice, 'Test humidifier 2', noopLogger);
  return { device, miotDevice };
}


test('p1200 style humidifier reports filter life level', () => {
  const { device, miotDevice } = createP1200StyleHumidifier();

  assert.equal(device.supportsFilterLifeLevelReporting(), true);
  miotDevice.getProperty('filter:filter-life-level').updateInternalValue(87);
  assert.equal(device.getFilterLifeLevel(), 87);
});

test('p1200 style humidifier supports filter life reset action', () => {
  const { device } = createP1200StyleHumidifier();

  assert.equal(device.supportsFilterLifeResetAction(), true);
});

test('p1200 style humidifier resolves water level from dm-service and reports percentage', () => {
  const { device, miotDevice } = createP1200StyleHumidifier();

  assert.equal(device.supportsWaterStatusReporting(), true);
  assert.equal(device.waterLevelProp().getName(), 'dm-service:water-level');

  miotDevice.getProperty('dm-service:water-level').updateInternalValue(67);
  assert.equal(device.getWaterLevelPercentage(), 67);
});

test('range based water level is converted to percentage', () => {
  const { device, miotDevice } = createRangeWaterLevelHumidifier();

  assert.equal(device.waterLevelProp().getName(), 'humidifier:water-level');

  miotDevice.getProperty('humidifier:water-level').updateInternalValue(64);
  assert.equal(device.getWaterLevelPercentage(), 50);
});
