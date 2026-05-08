import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../dist');
const app = Fastify({ logger: true });

await app.register(fastifyStatic, { root, prefix: '/' });

app.get('/', async () => ({
  tvbox: '/tvbox.json',
  status: '/status.json',
  checkResult: '/check-result.json'
}));

const host = '0.0.0.0';
const port = Number(process.env.PORT || 9977);
await app.listen({ host, port });
