import app from './app';
import { config } from './utils/config';

app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║           CostWatch — Backend API                ║
╠══════════════════════════════════════════════════╣
║  Port:       ${String(config.port).padEnd(35)}║
║  Mode:       ${config.nodeEnv.padEnd(35)}║
║  Data:       ${config.dataMode.padEnd(35)}║
║  Health:     http://localhost:${config.port}/api/health${' '.repeat(Math.max(0, 12 - String(config.port).length))}║
╚══════════════════════════════════════════════════╝
  `);
});
