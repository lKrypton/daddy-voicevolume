(function () {
    'use strict';

    var resourceName = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'daddy-voicevolume';
    var THROTTLE_MS = 90;
    var DEFAULT_BODY_HEIGHT = 280;
    var MIN_BODY_HEIGHT = 140;

    var appEl = document.getElementById('app');
    var headerEl = document.getElementById('panel-header');
    var bodyEl = document.getElementById('panel-body');
    var listEl = document.getElementById('player-list');
    var closeBtn = document.getElementById('close-btn');
    var resyncBtn = document.getElementById('resync-btn');
    var rangeBadgeEl = document.getElementById('range-badge');
    var emptyStateEl = document.getElementById('empty-state');
    var emptyTitleEl = document.querySelector('.empty-title');
    var emptyDescEl = document.getElementById('empty-desc');
    var resizeHandleEl = document.getElementById('resize-handle');
    var searchInputEl = document.getElementById('player-search');
    var searchClearBtn = document.getElementById('search-clear-btn');

    var minVolume = 5;
    var defaultVolume = 50;
    var maxVolume = 100;
    var listRange = 18;
    var openKey = 'F10';
    var searchQuery = '';
    var rows = {};
    var strings = {};

    function t(key, value) {
        var text = strings[key] || key;
        return value === undefined ? text : text.replace('%s', value);
    }

    function applyLocale(locale) {
        if (locale && typeof locale === 'object') strings = locale;
        document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
        document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.dataset.i18nTitle); });
        document.querySelectorAll('[data-i18n-aria]').forEach(function (el) { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
        document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPlaceholder); });
    }

    var isDraggingPanel = false;
    var dragOffsetX = 0;
    var dragOffsetY = 0;
    var isResizing = false;
    var resizeStartY = 0;
    var resizeStartHeight = DEFAULT_BODY_HEIGHT;

    headerEl.addEventListener('mousedown', function (e) {
        if (e.target.closest('#close-btn') || e.target.closest('#resync-btn')) return;
        isDraggingPanel = true;
        headerEl.style.cursor = 'grabbing';
        var rect = appEl.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    });

    document.addEventListener('mousemove', function (e) {
        if (isResizing) {
            var nextHeight = resizeStartHeight + (e.clientY - resizeStartY);
            applyBodyHeight(nextHeight, true);
            return;
        }

        if (!isDraggingPanel) return;
        var left = e.clientX - dragOffsetX;
        var top = e.clientY - dragOffsetY;

        left = Math.max(0, Math.min(window.innerWidth - appEl.offsetWidth, left));
        top = Math.max(0, Math.min(window.innerHeight - appEl.offsetHeight, top));

        appEl.style.left = left + 'px';
        appEl.style.top = top + 'px';
        appEl.style.right = 'auto';

        try {
            localStorage.setItem('daddy_voicevolume_pos', JSON.stringify({ left: left, top: top }));
        } catch (err) {}
    });

    document.addEventListener('mouseup', function () {
        if (isDraggingPanel) {
            isDraggingPanel = false;
            headerEl.style.cursor = 'grab';
        }

        if (isResizing) {
            isResizing = false;
            saveBodyHeight();
        }
    });

    resizeHandleEl.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        isResizing = true;
        resizeStartY = e.clientY;
        resizeStartHeight = bodyEl.getBoundingClientRect().height;
    });

    function maxBodyHeight() {
        var top = appEl.getBoundingClientRect().top;
        var chrome = 58;
        return Math.max(MIN_BODY_HEIGHT, window.innerHeight - top - chrome);
    }

    function applyBodyHeight(height, clampToViewport) {
        var maxHeight = clampToViewport ? maxBodyHeight() : 720;
        var next = Math.max(MIN_BODY_HEIGHT, Math.min(maxHeight, height));
        bodyEl.style.height = next + 'px';
        return next;
    }

    function saveBodyHeight() {
        try {
            localStorage.setItem('daddy_voicevolume_height', String(Math.round(bodyEl.getBoundingClientRect().height)));
        } catch (err) {}
    }

    function loadSavedLayout() {
        try {
            var savedPos = JSON.parse(localStorage.getItem('daddy_voicevolume_pos'));
            if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
                var maxLeft = window.innerWidth - appEl.offsetWidth;
                var maxTop = window.innerHeight - 80;
                var left = Math.max(0, Math.min(maxLeft, savedPos.left));
                var top = Math.max(0, Math.min(maxTop, savedPos.top));

                appEl.style.left = left + 'px';
                appEl.style.top = top + 'px';
                appEl.style.right = 'auto';
            }
        } catch (err) {}

        var savedHeight = DEFAULT_BODY_HEIGHT;
        try {
            var parsed = Number(localStorage.getItem('daddy_voicevolume_height'));
            if (parsed && parsed >= MIN_BODY_HEIGHT) {
                savedHeight = parsed;
            }
        } catch (err) {}

        applyBodyHeight(savedHeight, true);
    }

    function formatRange(range) {
        var rounded = Math.round(range);
        return String(rounded) + 'm';
    }

    function applyRangeLabel(range) {
        if (typeof range !== 'number' || range <= 0) {
            return;
        }

        listRange = range;
        rangeBadgeEl.textContent = formatRange(range);
        updateEmptyText();
    }

    function updateEmptyText() {
        var total = Object.keys(rows).length;
        if (total === 0) {
            if (emptyTitleEl) emptyTitleEl.textContent = t('emptyTitle');
            if (emptyDescEl) emptyDescEl.textContent = t('emptyDesc', Math.round(listRange));
        } else {
            if (emptyTitleEl) emptyTitleEl.textContent = t('noResultTitle');
            if (emptyDescEl) emptyDescEl.textContent = t('noResultDesc', searchQuery);
        }
    }

    function post(name, payload) {
        return fetch('https://' + resourceName + '/' + name, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=UTF-8' },
            body: JSON.stringify(payload || {}),
        }).catch(function () {
            return null;
        });
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function updateSliderTrack(sliderEl) {
        var val = Number(sliderEl.value);
        var min = Number(sliderEl.min) || 5;
        var max = Number(sliderEl.max) || 100;
        var percentage = ((val - min) / (max - min)) * 100;
        sliderEl.style.background = 'linear-gradient(90deg, #f43f5e ' + percentage + '%, rgba(255, 255, 255, 0.1) ' + percentage + '%)';
    }

    function sendVolume(row, immediate) {
        var value = Number(row.sliderEl.value);

        var doSend = function () {
            row.lastSent = Date.now();
            row.pendingTimer = null;
            post('setVolume', { serverId: row.serverId, volume: value });
        };

        if (row.pendingTimer) {
            clearTimeout(row.pendingTimer);
            row.pendingTimer = null;
        }

        if (immediate) {
            doSend();
            return;
        }

        var elapsed = Date.now() - (row.lastSent || 0);

        if (elapsed >= THROTTLE_MS) {
            doSend();
        } else {
            row.pendingTimer = setTimeout(doSend, THROTTLE_MS - elapsed);
        }
    }

    function filterRows() {
        var q = (searchQuery || '').toLowerCase().trim();
        var totalRows = 0;
        var visibleRows = 0;

        Object.keys(rows).forEach(function (serverId) {
            var row = rows[serverId];
            totalRows++;

            var nameMatch = row.playerName && row.playerName.toLowerCase().indexOf(q) !== -1;
            var idMatch = String(row.serverId).indexOf(q) !== -1;

            if (!q || nameMatch || idMatch) {
                row.el.style.display = '';
                visibleRows++;
            } else {
                row.el.style.display = 'none';
            }
        });

        if (totalRows > 0 && visibleRows === 0) {
            updateEmptyText();
            emptyStateEl.classList.add('is-visible');
        } else {
            emptyStateEl.classList.remove('is-visible');
            if (totalRows === 0) {
                updateEmptyText();
            }
        }
    }

    if (searchInputEl) {
        searchInputEl.addEventListener('input', function () {
            searchQuery = searchInputEl.value;
            if (searchClearBtn) {
                searchClearBtn.classList.toggle('hidden', !searchQuery);
            }
            filterRows();
        });
    }

    if (searchClearBtn) {
        searchClearBtn.addEventListener('click', function () {
            if (searchInputEl) {
                searchInputEl.value = '';
                searchQuery = '';
                searchClearBtn.classList.add('hidden');
                searchInputEl.focus();
                filterRows();
            }
        });
    }

    function createRow(player) {
        var el = document.createElement('div');
        el.className = 'player-card';
        el.dataset.serverId = String(player.serverId);

        el.addEventListener('mouseenter', function () {
            post('hoverPlayer', { serverId: player.serverId });
        });
        el.addEventListener('mouseleave', function () {
            post('hoverPlayer', { serverId: null });
        });

        var top = document.createElement('div');
        top.className = 'player-card-top';

        var info = document.createElement('div');
        info.className = 'player-info';

        var idBadge = document.createElement('span');
        idBadge.className = 'player-id-badge';
        idBadge.textContent = '#' + player.serverId;

        var nameEl = document.createElement('span');
        nameEl.className = 'player-name' + (player.masked ? ' is-masked' : '');
        nameEl.textContent = player.name;

        info.appendChild(idBadge);
        info.appendChild(nameEl);

        var distanceEl = document.createElement('div');
        distanceEl.className = 'player-distance-badge';
        distanceEl.textContent = player.distance.toFixed(1) + 'm';

        top.appendChild(info);
        top.appendChild(distanceEl);

        var controls = document.createElement('div');
        controls.className = 'player-card-controls';

        var sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';

        var sliderEl = document.createElement('input');
        sliderEl.type = 'range';
        sliderEl.className = 'player-slider';
        sliderEl.min = String(minVolume);
        sliderEl.max = String(maxVolume);
        sliderEl.step = '1';
        sliderEl.value = String(clamp(player.volume, minVolume, maxVolume));

        sliderContainer.appendChild(sliderEl);

        var valueEl = document.createElement('span');
        valueEl.className = 'player-volume-badge';
        valueEl.textContent = sliderEl.value + '%';

        var resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'player-reset-btn';
        resetBtn.title = t('resetToDefault');
        resetBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>';

        controls.appendChild(sliderContainer);
        controls.appendChild(valueEl);
        controls.appendChild(resetBtn);

        el.appendChild(top);
        el.appendChild(controls);

        updateSliderTrack(sliderEl);

        var row = {
            serverId: player.serverId,
            playerName: player.name,
            el: el,
            nameEl: nameEl,
            distanceEl: distanceEl,
            sliderEl: sliderEl,
            valueEl: valueEl,
            dragging: false,
            lastSent: 0,
            pendingTimer: null,
        };

        sliderEl.addEventListener('pointerdown', function () {
            row.dragging = true;
        });

        var endDrag = function () {
            if (!row.dragging) {
                return;
            }

            row.dragging = false;
            sendVolume(row, true);
        };

        sliderEl.addEventListener('pointerup', endDrag);
        sliderEl.addEventListener('pointercancel', endDrag);

        sliderEl.addEventListener('input', function () {
            valueEl.textContent = sliderEl.value + '%';
            updateSliderTrack(sliderEl);
            sendVolume(row, false);
        });

        resetBtn.addEventListener('click', function () {
            sliderEl.value = String(defaultVolume);
            valueEl.textContent = defaultVolume + '%';
            updateSliderTrack(sliderEl);
            row.dragging = false;
            sendVolume(row, true);
        });

        return row;
    }

    function updatePlayers(players) {
        var seen = {};

        players.forEach(function (player) {
            seen[player.serverId] = true;

            var row = rows[player.serverId];

            if (!row) {
                row = createRow(player);
                rows[player.serverId] = row;
                listEl.appendChild(row.el);
                return;
            }

            row.playerName = player.name;
            row.nameEl.textContent = player.name;
            row.nameEl.classList.toggle('is-masked', !!player.masked);
            row.distanceEl.textContent = player.distance.toFixed(1) + 'm';

            if (!row.dragging && !row.pendingTimer) {
                var incoming = String(clamp(player.volume, minVolume, maxVolume));

                if (row.sliderEl.value !== incoming) {
                    row.sliderEl.value = incoming;
                    row.valueEl.textContent = incoming + '%';
                    updateSliderTrack(row.sliderEl);
                }
            }
        });

        Object.keys(rows).forEach(function (serverId) {
            if (seen[serverId]) {
                return;
            }

            var row = rows[serverId];

            if (row.pendingTimer) {
                clearTimeout(row.pendingTimer);
            }

            row.el.remove();
            delete rows[serverId];
        });

        filterRows();
    }

    function clearRows() {
        Object.keys(rows).forEach(function (serverId) {
            var row = rows[serverId];

            if (row.pendingTimer) {
                clearTimeout(row.pendingTimer);
            }
        });

        rows = {};
        listEl.innerHTML = '';
        emptyStateEl.classList.remove('is-visible');
        updateEmptyText();
    }

    function showApp(data) {
        applyLocale(data.locale);

        if (typeof data.minVolume === 'number') {
            minVolume = data.minVolume;
        }

        if (typeof data.defaultVolume === 'number') {
            defaultVolume = data.defaultVolume;
        }

        if (typeof data.maxVolume === 'number') {
            maxVolume = data.maxVolume;
        }

        if (typeof data.openKey === 'string' && data.openKey.trim() !== '') {
            openKey = data.openKey.trim();
        }

        if (searchInputEl) {
            searchInputEl.value = '';
            searchQuery = '';
        }
        if (searchClearBtn) {
            searchClearBtn.classList.add('hidden');
        }

        applyRangeLabel(data.listRange);
        loadSavedLayout();
        appEl.classList.remove('hidden');
    }

    function hideApp() {
        appEl.classList.add('hidden');
        post('hoverPlayer', { serverId: null });
        if (searchInputEl) {
            searchInputEl.value = '';
            searchQuery = '';
        }
        if (searchClearBtn) {
            searchClearBtn.classList.add('hidden');
        }
        clearRows();
    }

    function requestClose() {
        post('close', {});
        hideApp();
    }

    closeBtn.addEventListener('click', requestClose);

    if (resyncBtn) {
        resyncBtn.addEventListener('click', function () {
            if (resyncBtn.classList.contains('is-syncing')) return;

            resyncBtn.classList.add('is-syncing');
            post('restartVoice', {});

            setTimeout(function () {
                resyncBtn.classList.remove('is-syncing');
            }, 1200);
        });
    }

    document.addEventListener('keydown', function (event) {
        if (appEl.classList.contains('hidden')) {
            return;
        }

        var pressedKey = event.key ? event.key.toUpperCase() : '';
        var pressedCode = event.code ? event.code.toUpperCase() : '';
        var targetKey = (openKey || 'F10').toUpperCase();

        // The open key (F10 by default) also closes the panel.
        if (pressedKey === targetKey || pressedCode === targetKey || pressedCode === ('KEY' + targetKey)) {
            event.preventDefault();
            requestClose();
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            if (document.activeElement === searchInputEl && searchInputEl.value) {
                searchInputEl.value = '';
                searchQuery = '';
                searchClearBtn.classList.add('hidden');
                filterRows();
                searchInputEl.blur();
            } else {
                requestClose();
            }
        }
    });

    window.addEventListener('message', function (event) {
        var data = event.data;

        if (!data || !data.action) {
            return;
        }

        if (data.action === 'open') {
            showApp(data);
        } else if (data.action === 'close') {
            hideApp();
        } else if (data.action === 'updatePlayers') {
            updatePlayers(data.players || []);
        }
    });
})();
