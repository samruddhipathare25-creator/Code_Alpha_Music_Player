
const state = {
    tracks: [],
    playlists: [],
    currentTrack: null,
    isPlaying: false,
    currentPlaylist: null,
    filteredTracks: [],
    currentFilter: 'all',
    darkMode: localStorage.getItem('darkMode') === 'true'
};
const audioPlayer = document.getElementById('audioPlayer');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progressBar = document.getElementById('progressBar');
const volumeControl = document.getElementById('volumeControl');
const trackTitle = document.getElementById('trackTitle');
const trackArtist = document.getElementById('trackArtist');
const trackGenre = document.getElementById('trackGenre');
const currentTimeDisplay = document.getElementById('currentTime');
const durationDisplay = document.getElementById('duration');
const volumeValue = document.getElementById('volumeValue');
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const tracksContainer = document.getElementById('tracksContainer');
const playlistsContainer = document.getElementById('playlistsContainer');
const createPlaylistBtn = document.getElementById('createPlaylistBtn');
const playlistModal = document.getElementById('playlistModal');
const addToPlaylistModal = document.getElementById('addToPlaylistModal');
const playlistNameInput = document.getElementById('playlistNameInput');
const confirmPlaylistBtn = document.getElementById('confirmPlaylistBtn');
const confirmAddBtn = document.getElementById('confirmAddBtn');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const themeToggle = document.getElementById('themeToggle');
const closeButtons = document.querySelectorAll('.close');

function initApp() {
    loadFromLocalStorage();
    applyTheme();
    setupEventListeners();
    renderTracks();
    renderPlaylists();
}
function applyTheme() {
    if (state.darkMode) {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️ Light Mode';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = '🌙 Dark Mode';
    }
}
themeToggle.addEventListener('click', () => {
    state.darkMode = !state.darkMode;
    localStorage.setItem('darkMode', state.darkMode);
    applyTheme();
});
function setupEventListeners() {
    playBtn.addEventListener('click', togglePlay);
    nextBtn.addEventListener('click', nextTrack);
    prevBtn.addEventListener('click', prevTrack);
    progressBar.addEventListener('change', seek);
    volumeControl.addEventListener('input', changeVolume);

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragging');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragging');
    });
    uploadArea.addEventListener('drop', handleFileDrop);
    fileInput.addEventListener('change', handleFileSelect);

    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    audioPlayer.addEventListener('ended', nextTrack);
    
    audioPlayer.addEventListener('loadstart', () => {
        console.log(`▶ Starting load...`);
    });
    
    audioPlayer.addEventListener('canplay', () => {
        console.log(`✓ Ready to play`);
    });
    
    audioPlayer.addEventListener('canplaythrough', () => {
        console.log(`✓ Fully loaded and can play through`);
    });
    
    audioPlayer.addEventListener('error', (e) => {
        const errorCode = audioPlayer.error?.code;
        const errorMessages = {
            1: 'MEDIA_ERR_ABORTED - Loading was aborted',
            2: 'MEDIA_ERR_NETWORK - Network error',
            3: 'MEDIA_ERR_DECODE - Unsupported audio format or corrupted file',
            4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Browser cannot play this format'
        };
        
        const errorMessage = errorMessages[errorCode] || `Unknown error (${errorCode})`;
        
        console.error('❌ Audio Error:', errorMessage);
        console.error('File:', state.currentTrack?.originalName);
        console.error('Browser Support:', {
            mp3: audioPlayer.canPlayType('audio/mpeg'),
            wav: audioPlayer.canPlayType('audio/wav'),
            ogg: audioPlayer.canPlayType('audio/ogg'),
            m4a: audioPlayer.canPlayType('audio/mp4')
        });
        
        if (state.currentTrack) {
            if (errorCode === 4) {
                alert(`Cannot play "${state.currentTrack.title}"\n\nYour browser doesn't support this audio format.\n\nTry converting to MP3 or WAV format.`);
            } else if (errorCode === 3) {
                alert(`Cannot play "${state.currentTrack.title}"\n\nThe file may be corrupted or in an unsupported format.\n\nTry re-uploading or use a different file.`);
            } else {
                alert(`Cannot play "${state.currentTrack.title}": ${errorMessage}`);
            }
        }
    });

    searchInput.addEventListener('input', handleSearch);
    filterButtons.forEach(btn => {
        btn.addEventListener('click', handleFilter);
    });

    createPlaylistBtn.addEventListener('click', openPlaylistModal);
    confirmPlaylistBtn.addEventListener('click', createPlaylist);

    closeButtons.forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    volumeControl.value = 70;
    audioPlayer.volume = 0.7;
}
function togglePlay() {
    if (!state.currentTrack) {
        if (state.tracks.length > 0) {
            loadTrack(0);
        } else {
            alert('Add tracks to the player first');
            return;
        }
    }

    if (state.isPlaying) {
        audioPlayer.pause();
        state.isPlaying = false;
        playBtn.textContent = '▶';
    } else {
        const playPromise = audioPlayer.play();
        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    state.isPlaying = true;
                    playBtn.textContent = '⏸';
                })
                .catch(error => {
                    console.error('Playback error:', error);
                    alert('Error playing audio. Please check the file format.');
                });
        } else {
            state.isPlaying = true;
            playBtn.textContent = '⏸';
        }
    }
}
function nextTrack() {
    if (state.filteredTracks.length === 0) return;
    const currentIndex = state.filteredTracks.findIndex(t => t.id === state.currentTrack?.id);
    const nextIndex = (currentIndex + 1) % state.filteredTracks.length;
    loadTrack(nextIndex);
    if (state.isPlaying) audioPlayer.play();
}
function prevTrack() {
    if (state.filteredTracks.length === 0) return;
    const currentIndex = state.filteredTracks.findIndex(t => t.id === state.currentTrack?.id);
    const prevIndex = currentIndex === 0 ? state.filteredTracks.length - 1 : currentIndex - 1;
    loadTrack(prevIndex);
    if (state.isPlaying) audioPlayer.play();
}
function loadTrack(index) {
    const track = state.filteredTracks[index];
    if (!track) return;
    state.currentTrack = track;
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    state.isPlaying = false;
    playBtn.textContent = '▶';
    progressBar.value = 0;
    try {
        if (!track.url) {
            throw new Error('No audio URL available');
        }
        audioPlayer.innerHTML = '';
        audioPlayer.src = ''; 
        audioPlayer.src = track.url;
        audioPlayer.load();
        console.log(`✓ Loading: "${track.title}"`);   
    } catch (error) {
        console.error('Error in loadTrack:', error);
        alert(`Error loading "${track.title}": ${error.message}`);
        return;
    }
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || 'Unknown Artist';
    trackGenre.textContent = track.genre || 'Unknown Genre';
    renderTracks();
}
function updateProgress() {
    const percentage = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBar.value = percentage;
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
}
function updateDuration() {
    durationDisplay.textContent = formatTime(audioPlayer.duration);
}
function seek(e) {
    const percentage = e.target.value / 100;
    audioPlayer.currentTime = percentage * audioPlayer.duration;
}
function changeVolume(e) {
    const volume = e.target.value / 100;
    audioPlayer.volume = volume;
    volumeValue.textContent = e.target.value + '%';
}
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
}
function handleFileDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragging');
    const files = e.dataTransfer.files;
    processFiles(files);
}
function handleFileSelect(e) {
    processFiles(e.target.files);
}
function getMimeType(filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap = {
        'mp3': 'audio/mpeg',
        'mpeg': 'audio/mpeg',
        'mpa': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'aac': 'audio/aac',
        'flac': 'audio/flac',
        'wma': 'audio/x-ms-wma',
        'webm': 'audio/webm'
    };
    return mimeMap[ext] || 'audio/mpeg';
}

function parseFileName(filename) {
    const base = filename.replace(/\.[^/.]+$/, '').trim();
    const delimiter = ' - ';
    if (base.includes(delimiter)) {
        const [artistPart, titlePart] = base.split(delimiter).map(s => s.trim());
        return {
            title: titlePart || artistPart,
            artist: artistPart || 'Unknown Artist'
        };
    }

    const reversePattern = /(.+) - (.+)/;
    const rmatch = reversePattern.exec(base);
    if (rmatch) {
        return {
            title: rmatch[1].trim(),
            artist: rmatch[2].trim() || 'Unknown Artist'
        };
    }

    // Fall back to unknown
    return {
        title: base,
        artist: 'Unknown Artist'
    };
}
function getAudioSupport() {
    const audio = document.createElement('audio');
    return {
        mp3: audio.canPlayType('audio/mpeg') !== '',
        wav: audio.canPlayType('audio/wav') !== '',
        ogg: audio.canPlayType('audio/ogg') !== '',
        m4a: audio.canPlayType('audio/mp4') !== '',
        aac: audio.canPlayType('audio/aac') !== '',
        webm: audio.canPlayType('audio/webm') !== ''
    };
}
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.onabort = () => reject(new Error('File reading aborted'));
        reader.readAsDataURL(file);
    });
}
function readAudioTags(file) {
    return new Promise((resolve) => {
        if (!window.jsmediatags) {
            resolve(null);
            return;
        }

        window.jsmediatags.read(file, {
            onSuccess: (tag) => resolve(tag.tags),
            onError: () => resolve(null)
        });
    });
}

function processFiles(files) {
    const audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'mpeg', 'mpa', 'webm'];
    const audioSupport = getAudioSupport();
    
    const fileArray = Array.from(files).filter(file => {
        // Check MIME type first
        if (file.type.startsWith('audio/')) return true;
        
        // Fallback: check file extension
        const extension = file.name.split('.').pop()?.toLowerCase();
        return audioExtensions.includes(extension);
    });
    
    if (fileArray.length === 0) {
        alert('No audio files selected. Supported: MP3, WAV, OGG, M4A, FLAC, AAC, WMA');
        return;
    }

    console.log('Browser Audio Support:', audioSupport);

    let completedFiles = 0;

    fileArray.forEach(file => {
        const mimeType = getMimeType(file.name);
        const fallbackMeta = parseFileName(file.name);

        Promise.all([readAudioTags(file), readFileAsDataURL(file)])
            .then(([tags, dataUrl]) => {
                try {
                    const title = tags && tags.title ? String(tags.title).trim() : fallbackMeta.title;
                    const artist = tags && tags.artist ? String(tags.artist).trim() : fallbackMeta.artist;
                    const genre = tags && tags.genre ? String(tags.genre).trim() : 'Unknown';

                    const track = {
                        id: Date.now() + Math.random(),
                        title: title || fallbackMeta.title,
                        artist: artist || fallbackMeta.artist,
                        genre: genre || 'Unknown',
                        url: dataUrl,
                        mimeType: mimeType,
                        fileSize: file.size,
                        originalName: file.name,
                        originalFile: file,
                        duration: 0,
                        dateAdded: new Date().toLocaleDateString()
                    };

                    state.tracks.push(track);
                    completedFiles++;

                    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
                    console.log(`✓ Loaded: ${file.name} (${sizeMB}MB, artist: ${track.artist}, title: ${track.title})`);

                    if (completedFiles === fileArray.length) {
                        saveToLocalStorage();
                        renderTracks();
                        applyFilters();
                        console.log(`✓ Total tracks: ${state.tracks.length}`);
                    }
                } catch (error) {
                    console.error('Error in promise resolution:', error);
                    completedFiles++;
                    if (completedFiles === fileArray.length) {
                        saveToLocalStorage();
                        renderTracks();
                        applyFilters();
                    }
                }
            })
            .catch(error => {
                console.error('Error loading file or tags:', file.name, error);
                completedFiles++;
                if (completedFiles === fileArray.length) {
                    saveToLocalStorage();
                    renderTracks();
                    applyFilters();
                }
            });
        });
    fileInput.value = '';
}

function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    applyFilters(query);
}

function handleFilter(e) {
    filterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    state.currentFilter = e.target.getAttribute('data-filter');
    applyFilters();
}

function applyFilters(searchQuery = '') {
    state.filteredTracks = state.tracks.filter(track => {
        const matchesSearch =
            track.title.toLowerCase().includes(searchQuery) ||
            track.artist.toLowerCase().includes(searchQuery) ||
            track.genre.toLowerCase().includes(searchQuery);

        const matchesFilter =
            state.currentFilter === 'all' ||
            track.genre.toLowerCase() === state.currentFilter.toLowerCase();

        return matchesSearch && matchesFilter;
    });

    renderTracks();
}
function openPlaylistModal() {
    playlistNameInput.value = '';
    playlistModal.classList.add('show');
    playlistNameInput.focus();
}

function createPlaylist() {
    const name = playlistNameInput.value.trim();
    if (!name) {
        alert('Please enter a playlist name');
        return;
    }

    const playlist = {
        id: Date.now(),
        name: name,
        tracks: [],
        createdDate: new Date().toLocaleDateString()
    };

    state.playlists.push(playlist);
    saveToLocalStorage();
    renderPlaylists();
    closeAllModals();
}

function deletePlaylist(playlistId) {
    if (confirm('Are you sure you want to delete this playlist?')) {
        state.playlists = state.playlists.filter(p => p.id !== playlistId);
        saveToLocalStorage();
        renderPlaylists();
    }
}

function addToPlaylist(trackId) {
    if (state.playlists.length === 0) {
        alert('Create a playlist first');
        return;
    }

    const playlistSelectContainer = document.getElementById('playlistSelectContainer');
    playlistSelectContainer.innerHTML = '';

    state.playlists.forEach(playlist => {
        const item = document.createElement('div');
        item.className = 'playlist-select-item';
        item.textContent = playlist.name;
        item.addEventListener('click', () => {
            document.querySelectorAll('.playlist-select-item').forEach(el => {
                el.classList.remove('selected');
            });
            item.classList.add('selected');
            item.dataset.playlistId = playlist.id;
        });
        playlistSelectContainer.appendChild(item);
    });

    addToPlaylistModal.classList.add('show');

    confirmAddBtn.onclick = () => {
        const selected = document.querySelector('.playlist-select-item.selected');
        if (selected && selected.dataset.playlistId) {
            const playlist = state.playlists.find(p => p.id == selected.dataset.playlistId);
            const track = state.tracks.find(t => t.id === trackId);
            if (!playlist.tracks.find(t => t.id === trackId)) {
                playlist.tracks.push(track);
                saveToLocalStorage();
                closeAllModals();
                alert(`Added "${track.title}" to "${playlist.name}"`);
            } else {
                alert('Track already in this playlist');
            }
        }
    };
}

function playPlaylist(playlistId) {
    const playlist = state.playlists.find(p => p.id === playlistId);
    if (playlist && playlist.tracks.length > 0) {
        state.currentPlaylist = playlistId;
        state.filteredTracks = [...playlist.tracks];
        loadTrack(0);
        togglePlay();
        renderPlaylists();
        renderTracks();
    }
}

function clearPlaylist(playlistId) {
    if (confirm('Are you sure you want to clear all tracks from this playlist?')) {
        const playlist = state.playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.tracks = [];
            saveToLocalStorage();
            if (state.currentPlaylist === playlistId) {
                state.filteredTracks = [];
                state.currentTrack = null;
                audioPlayer.src = '';
                renderTracks();
            }
        }
    }
}

function renderTracks() {
    tracksContainer.innerHTML = '';

    if (state.filteredTracks.length === 0) {
        tracksContainer.innerHTML = `
            <div class="empty-state">
                <p>No tracks found. Upload some music to get started!</p>
            </div>
        `;
        return;
    }

    state.filteredTracks.forEach((track, index) => {
        const trackEl = document.createElement('div');
        trackEl.className = `track-item ${state.currentTrack?.id === track.id ? 'playing' : ''}`;
        trackEl.innerHTML = `
            <div class="track-number">${index + 1}</div>
            <div class="track-details" style="flex: 1; cursor: pointer;">
                <div class="track-title">${track.title}</div>
                <div class="track-meta">
                    <span>${track.artist}</span>
                    <span>${track.genre}</span>
                    <span>${track.dateAdded}</span>
                </div>
            </div>
            <div class="track-actions">
                <button class="track-action-btn" type="button">+ Playlist</button>
                <button class="track-action-btn delete" type="button">Delete</button>
            </div>
        `;

        trackEl.querySelector('.track-details').addEventListener('click', () => {
            const trackIndex = state.filteredTracks.findIndex(t => t.id === track.id);
            loadTrack(trackIndex);
            if (!state.isPlaying) togglePlay();
        });

        trackEl.querySelector('.track-action-btn:not(.delete)').addEventListener('click', (e) => {
            e.stopPropagation();
            addToPlaylist(track.id);
        });

        trackEl.querySelector('.track-action-btn.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Delete this track?')) {
                state.tracks = state.tracks.filter(t => t.id !== track.id);
                if (state.currentTrack?.id === track.id) {
                    state.currentTrack = null;
                    audioPlayer.src = '';
                    playBtn.textContent = '▶';
                    state.isPlaying = false;
                }
                saveToLocalStorage();
                applyFilters(searchInput.value);
            }
        });

        tracksContainer.appendChild(trackEl);
    });
}

function renderPlaylists() {
    playlistsContainer.innerHTML = '';

    if (state.playlists.length === 0) {
        playlistsContainer.innerHTML = `
            <div class="empty-state">
                <p>No playlists yet. Create one to organize your music!</p>
            </div>
        `;
        return;
    }

    state.playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.className = `playlist-card ${state.currentPlaylist === playlist.id ? 'active' : ''}`;
        playlistCard.innerHTML = `
            <h4>🎵 ${playlist.name}</h4>
            <p>${playlist.tracks.length} track${playlist.tracks.length !== 1 ? 's' : ''}</p>
            <p style="font-size: 0.75em; color: var(--text-secondary);">Created: ${playlist.createdDate}</p>
            <div class="playlist-actions">
                <button type="button" class="play-playlist">Play</button>
                <button type="button" class="clear-playlist">Clear</button>
                <button type="button" class="delete">Delete</button>
            </div>
        `;

        playlistCard.querySelector('.play-playlist').addEventListener('click', (e) => {
            e.stopPropagation();
            playPlaylist(playlist.id);
        });

        playlistCard.querySelector('.clear-playlist').addEventListener('click', (e) => {
            e.stopPropagation();
            clearPlaylist(playlist.id);
        });

        playlistCard.querySelector('.delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deletePlaylist(playlist.id);
        });

        playlistsContainer.appendChild(playlistCard);
    });
}

function saveToLocalStorage() {
    const dataToSave = {
        tracks: state.tracks.filter(t => t.url.startsWith('data:')),
        playlists: state.playlists.map(p => ({
            ...p,
            tracks: p.tracks.filter(t => t.url.startsWith('data:'))
        }))
    };
    localStorage.setItem('musicPlayerData', JSON.stringify(dataToSave));
}

function loadFromLocalStorage() {
    const savedData = localStorage.getItem('musicPlayerData');
    if (savedData) {
        const data = JSON.parse(savedData);
        state.tracks = data.tracks || [];
        state.playlists = data.playlists || [];

        // Restore playlist references
        state.playlists.forEach(playlist => {
            if (!Array.isArray(playlist.tracks)) {
                playlist.tracks = [];
            }
        });
    }

    state.filteredTracks = [...state.tracks];
}

function closeAllModals() {
    playlistModal.classList.remove('show');
    addToPlaylistModal.classList.remove('show');
    confirmAddBtn.onclick = null;
}

window.addEventListener('click', (e) => {
    if (e.target === playlistModal || e.target === addToPlaylistModal) {
        closeAllModals();
    }
});

playlistNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        createPlaylist();
    }
});

document.addEventListener('DOMContentLoaded', initApp);
