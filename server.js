
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(__dirname));

const db = {
  users: {},
  playlists: {},
  tracks: {}
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running' });
});

app.get('/api/playlists/:userId', (req, res) => {
  const { userId } = req.params;
  const userPlaylists = db.playlists[userId] || [];
  res.json(userPlaylists);
});

app.post('/api/playlists', (req, res) => {
  const { userId, name, description } = req.body;
  
  if (!userId || !name) {
    return res.status(400).json({ error: 'userId and name required' });
  }

  if (!db.playlists[userId]) {
    db.playlists[userId] = [];
  }

  const playlist = {
    id: Date.now(),
    userId,
    name,
    description: description || '',
    tracks: [],
    createdDate: new Date().toISOString(),
    updatedDate: new Date().toISOString()
  };

  db.playlists[userId].push(playlist);
  res.status(201).json(playlist);
});

app.put('/api/playlists/:playlistId', (req, res) => {
  const { playlistId } = req.params;
  const { userId, name, description } = req.body;

  for (let user in db.playlists) {
    const playlist = db.playlists[user].find(p => p.id == playlistId);
    if (playlist && user === userId) {
      playlist.name = name || playlist.name;
      playlist.description = description || playlist.description;
      playlist.updatedDate = new Date().toISOString();
      return res.json(playlist);
    }
  }

  res.status(404).json({ error: 'Playlist not found' });
});

app.delete('/api/playlists/:playlistId', (req, res) => {
  const { playlistId } = req.params;
  const { userId } = req.body;

  if (db.playlists[userId]) {
    const index = db.playlists[userId].findIndex(p => p.id == playlistId);
    if (index > -1) {
      const deleted = db.playlists[userId].splice(index, 1);
      return res.json({ message: 'Playlist deleted', playlist: deleted[0] });
    }
  }

  res.status(404).json({ error: 'Playlist not found' });
});

app.post('/api/playlists/:playlistId/tracks', (req, res) => {
  const { playlistId } = req.params;
  const { userId, track } = req.body;

  if (!track || !track.id) {
    return res.status(400).json({ error: 'Track data required' });
  }

  for (let user in db.playlists) {
    const playlist = db.playlists[user].find(p => p.id == playlistId);
    if (playlist && user === userId) {
      if (!playlist.tracks.find(t => t.id === track.id)) {
        playlist.tracks.push(track);
        playlist.updatedDate = new Date().toISOString();
        return res.status(201).json(playlist);
      } else {
        return res.status(400).json({ error: 'Track already in playlist' });
      }
    }
  }

  res.status(404).json({ error: 'Playlist not found' });
});

app.delete('/api/playlists/:playlistId/tracks/:trackId', (req, res) => {
  const { playlistId, trackId } = req.params;
  const { userId } = req.body;

  for (let user in db.playlists) {
    const playlist = db.playlists[user].find(p => p.id == playlistId);
    if (playlist && user === userId) {
      const trackIndex = playlist.tracks.findIndex(t => t.id == trackId);
      if (trackIndex > -1) {
        const removed = playlist.tracks.splice(trackIndex, 1);
        playlist.updatedDate = new Date().toISOString();
        return res.json({ message: 'Track removed', track: removed[0] });
      }
    }
  }

  res.status(404).json({ error: 'Track or playlist not found' });
});

app.get('/api/playlists/public', (req, res) => {
  const publicPlaylists = [];
  for (let user in db.playlists) {
    publicPlaylists.push(...db.playlists[user]);
  }
  res.json(publicPlaylists);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`

   🎵 Music Player Server Running      
   http://localhost:${PORT}            

  `);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});
