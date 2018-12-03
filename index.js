const peer = require('./src/peer');

async function run() {
  await peer.ready();
  console.log('ready!');
  try {
    await peer.loadLocalProfile();
    console.log('profile loaded!');
  } catch (error) {
    await peer.createLocalProfile({
      name: 'gustavo',
      description: 'human from earth'
    });
    console.log('profile created!');
  } finally {
    const hashes = [];
    await peer.subscribeMyFeed();
    console.log('subscribed to my feed!');
    
    const hash1 = await peer.publish('olá', { keep: true });
    hashes.push(hash1);
    const hash2 = await peer.publish('tudo', { keep: true, tags: ['gato', 'cachorro' ] });
    hashes.push(hash2);
    const hash3 = await peer.publish('bem?');
    hashes.push(hash3);

    console.log('hashes: ', hashes);
  }

}

run();