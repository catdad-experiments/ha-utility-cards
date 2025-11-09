const path = require('path');
const { promises: fs } = require('fs');
const { gzip } = require('zlib');
const { promisify } = require('util');

const esbuild = require('esbuild');

const OUTDIR = path.resolve(__dirname, 'dist');
const prod = process.argv.includes('--prod');
const dev = process.argv.includes('--dev');
const watch = dev || process.argv.includes('--watch');
const verbose = process.argv.includes('--verbose');

const outname = `utility-cards.js`;

const createGzip = promisify(gzip);

const writeOutput = async file => {
  await fs.writeFile(path.resolve(OUTDIR, outname), file.contents);

  if (dev) {
    const remoteDir = `P:/homeassistant/www/community/ha-utility-cards`;
    await fs.writeFile(`${remoteDir}/${outname}`, file.contents);
    await fs.writeFile(`${remoteDir}/${outname}.gz`, await createGzip(file.contents));

    // TODO modily P:/homeassistant/.storage/lovelace_resources
  }
};

const buildLib = async () => {
  const context = await esbuild.context({
    minify: !!prod,
    sourcemap: prod ? false : 'inline',
    entryPoints: ['src/main.ts'],
    bundle: true,
    write: false,
    logLevel: verbose ? 'info' : 'error',
    treeShaking: true,
    tsconfig: path.resolve(__dirname, 'tsconfig.json'),
    plugins: [{
      name: 'file-writer',
      setup(build) {
        build.onEnd(({ outputFiles }) => {
          const [file] = outputFiles;

          writeOutput(file).then(() => {
            console.log(`${new Date().toISOString()}: output written`);
          }).catch(e => {
            console.error(`${new Date().toISOString()}: failed to write file: `, e);
            process.exitCode = 1;
          });
        });
      }
    }]
  });

  if (watch) {
    await context.watch()
  } else {
    await context.rebuild();
    await context.dispose();
  }
};

(async () => {
  await fs.rm(OUTDIR, {
    force: true,
    recursive: true
  });
  await fs.mkdir(OUTDIR, { recursive: true });

  await buildLib();
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
