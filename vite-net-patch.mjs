import os from 'node:os';
const stub = () => ({
  lo: [
    { address: '127.0.0.1', netmask: '255.0.0.0', family: 'IPv4', mac: '00:00:00:00:00:00', internal: true, cidr: '127.0.0.1/8' },
  ],
});
try {
  // @ts-ignore
  os.networkInterfaces = stub;
  // Also patch Object.getOwnPropertyDescriptor path if needed
} catch {}
