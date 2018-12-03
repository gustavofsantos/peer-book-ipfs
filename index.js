const Peer = require('./src/peer');

const peer = new Peer();

async function test() {
  await peer.ready();
  try {
    await peer.loadLocalProfile();
  } catch (e) {
    await peer.createLocalProfile({
      name: 'gustavo',
      description: 'human from earth'
    });
  } finally {
    await peer.subscribeMyFeed();
    await peer.publish('olá', { keep: true });
    await peer.publish('tudo', { keep: true, tags: ['gato', 'cachorro' ] });
    await peer.publish('bem?');
  }
}

test();