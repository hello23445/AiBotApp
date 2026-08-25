const modalBackdrop = document.getElementById('modalBackdrop');
const connectBtn = document.getElementById('connectBtn');
const modalClose = document.getElementById('modalClose');
const instructions = document.getElementById('instructions');
const tabs = [...document.querySelectorAll('.tab')];
const homeView = document.getElementById('homeView');
const managementView = document.getElementById('managementView');
const appSettingsView = document.getElementById('appSettingsView');
const statisticsView = document.getElementById('statisticsView');
const settingsForm = document.getElementById('settingsForm');
const confirmBackdrop = document.getElementById('confirmBackdrop');
const commandsList = document.getElementById('commandsList');
const addCommandBtn = document.getElementById('addCommandBtn');
const addCommandLabel = document.getElementById('addCommandLabel');
const statisticsBtn = document.getElementById('statisticsBtn');
const statisticsBackBtn = document.getElementById('statisticsBackBtn');
const statisticsPanel = document.getElementById('statisticsPanel');
const statisticsLoader = document.getElementById('statisticsLoader');
const clientsCount = document.getElementById('clientsCount');
const statisticsRefreshBtn = document.getElementById('statisticsRefreshBtn');
const statisticsCooldown = document.getElementById('statisticsCooldown');
const saveButton = document.getElementById('saveBtn');
const savedSettingsKey = 'aiBotSettings';
const lastSaveKey = 'aiBotLastSaveAt';
const saveCooldownMs = 2 * 60 * 1000;
const saveBackdrop = document.getElementById('saveBackdrop');
const saveLoader = document.getElementById('saveLoader');
const saveTitle = document.getElementById('saveTitle');
const saveMessage = document.getElementById('saveMessage');
const saveErrorClose = document.getElementById('saveErrorClose');
const saveSuccessClose = document.getElementById('saveSuccessClose');
const appSettingsBackBtn = document.getElementById('appSettingsBackBtn');
const windowedBtn = document.getElementById('windowedBtn');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const closingConfirmOnBtn = document.getElementById('closingConfirmOnBtn');
const closingConfirmOffBtn = document.getElementById('closingConfirmOffBtn');
const telegramId = document.getElementById('telegramId');
const copyTelegramIdBtn = document.getElementById('copyTelegramIdBtn');
const topbarPositionInput = document.getElementById('topbarPosition');
const topbarPositionValue = document.getElementById('topbarPositionValue');
const telegramWebApp = window.Telegram?.WebApp;
const webAppUrl = 'https://script.google.com/macros/s/AKfycbwXkAdkTc4n_4FtuAHvxfzJCiDHgkS3rLDZqEAKucp2LvRsKxUGacJuMmxLNQhUk4U17A/exec';
const maxCommands = 3;
const maxEmojis = 100;
const appSettingsKey = 'aiBotAppSettings';
const statisticsUrl = 'https://script.google.com/macros/s/AKfycbySGHQYOncTSopLghMgR0Q_Y6z3gTft-hWpWt5zEmMAnvOr-MF-40cTlbOgf4MCRpVHXg/exec';
const statisticsCachePrefix = 'aiBotStatistics_';
const statisticsCooldownMs = 2 * 60 * 1000;
const emojiSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;
let savedSettings = {};
let saveCooldownTimer;
let currentScreen = 'home';
let appSettingsOrigin = 'home';
let telegramBackHandler;
let telegramSettingsHandler;
let statisticsOrigin = 'home';
let statisticsCooldownTimer;

const telegramUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
  || localStorage.getItem('AdminUserID')
  || 'Не найдено';

function setTelegramButtonHandler(button, handler, propertyName) {
  const previousHandler = propertyName === 'back' ? telegramBackHandler : telegramSettingsHandler;
  if (previousHandler) button.offClick?.(previousHandler);
  button.onClick?.(handler);
  if (propertyName === 'back') {
    telegramBackHandler = handler;
  } else {
    telegramSettingsHandler = handler;
  }
}

function syncTelegramButtons() {
  const modalIsOpen = !modalBackdrop.hidden;
  const appSettingsAreOpen = !appSettingsView.hidden;
  const statisticsAreOpen = !statisticsView.hidden;
  const managementIsOpen = !managementView.hidden;
  const shouldShowBackButton = modalIsOpen || appSettingsAreOpen || statisticsAreOpen || managementIsOpen;
  const shouldShowSettingsButton = !modalIsOpen && !appSettingsAreOpen && !statisticsAreOpen && !managementIsOpen;

  settingsBtn.disabled = appSettingsAreOpen || statisticsAreOpen;

  if (telegramWebApp?.BackButton) {
    if (shouldShowBackButton) {
      const handler = modalIsOpen
        ? closeModal
        : appSettingsAreOpen
          ? closeAppSettings
          : statisticsAreOpen
            ? closeStatistics
            : requestCloseManagement;
      setTelegramButtonHandler(telegramWebApp.BackButton, handler, 'back');
      telegramWebApp.BackButton.show?.();
    } else {
      telegramWebApp.BackButton.hide?.();
    }
  }

  if (telegramWebApp?.SettingsButton) {
    if (shouldShowSettingsButton) {
      setTelegramButtonHandler(telegramWebApp.SettingsButton, () => openAppSettings(currentScreen), 'settings');
      telegramWebApp.SettingsButton.show?.();
    } else {
      telegramWebApp.SettingsButton.hide?.();
    }
  }
}

const steps = {
  iphone: {
    title: 'iPhone:',
    video: 'explain_iphone.MP4',

    items: [
      'Откройте Telegram',
      'Откройте настройки телеграма.',
      'Нажмите на "Изм." в правом верхнем углу.',
      'Пролистайте вниз и выберите пункт "Автоматизация чатов"',
      'В поле ввода введите <code>@AiAnswers2_bot</code> или же ссылку на бота <code>https://t.me/AiAnswers2_bot</code>',
      'Нажмите ниже кнопку "Добавить".',
      'Убедитесь что у бота есть разрешение "Сообщения".'
    ]
  },

  android: {
    title: 'Android & Windows:',
    video: 'explain_android_windows.MP4',

    items: [
      'Откройте Telegram.',
      'Откройте настройки телеграма.',
      'Нажмите на троеточие в правом верхнем углу.',
      'Нажмите "Изменить профиль".',
      'Нажмите "Автоматизация чатов".',
      'В поле ввода введите <code>@AiAnswers2_bot</code> или же ссылку на бота <code>https://t.me/AiAnswers2_bot</code>',
      'Нажмите ниже кнопку "Добавить".',
      'Убедитесь что у бота есть разрешение "Сообщения".'
    ]
  }
};

function renderInstructions(platform = 'iphone') {
  const data = steps[platform];

  instructions.innerHTML = `
    <div class="platform-label">${data.title}</div>

    <div class="video-wrap">
      <video
        autoplay
        muted
        playsinline
        loop
        preload="metadata"
      >
        <source src="${data.video}" type="video/mp4">
        Ваш браузер не поддерживает воспроизведение видео.
      </video>
    </div>

    <ol class="step-list">
      ${data.items.map(item => `<li>${item}</li>`).join('')}
    </ol>
  `;
}

function openModal() {
  renderInstructions('iphone');

  modalBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
  syncTelegramButtons();

  const video = instructions.querySelector('video');

  video?.play().catch(() => {});
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
  syncTelegramButtons();
}

connectBtn.addEventListener('click', openModal);

modalClose.addEventListener('click', closeModal);

modalBackdrop.addEventListener('click', (event) => {
  if (event.target === modalBackdrop) {
    closeModal();
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !modalBackdrop.hidden) {
    closeModal();
  } else if (event.key === 'Escape' && !confirmBackdrop.hidden) {
    keepEditing();
  }
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => {
      const active = t === tab;

      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', String(active));
    });

    renderInstructions(tab.dataset.platform);

    instructions
      .querySelector('video')
      ?.play()
      .catch(() => {});
  });
});

function readSettings() {
  const settings = Object.fromEntries(new FormData(settingsForm).entries());
  settings.commands = [...commandsList.querySelectorAll('.command-row')].map(row => ({
    command: row.querySelector('.command-input').value,
    message: row.querySelector('.command-message').value
  }));
  return settings;
}

function getSelectedText(name, customName) {
  const selected = settingsForm.querySelector(`input[name="${name}"]:checked`);
  if (selected?.value === 'custom') return settingsForm.elements[customName].value;
  return selected?.closest('.radio-option')?.querySelector('span')?.textContent.trim() || '';
}

function buildBusinessPayload(settings) {
  return {
    business_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || localStorage.getItem('AdminUserID') || '',
    B: getSelectedText('greetingMode', 'customGreeting'),
    C: getSelectedText('thinkingMode', 'customThinking'),
    D: getSelectedText('unknownAnswerMode', 'customUnknownAnswer'),
    E: getSelectedText('emojiMode', 'customEmoji'),
    F: getSelectedText('tone'),
    G: JSON.stringify({ thinkingLevel: settings.thinkingLevel }),
    H: JSON.stringify({
      aiLinksPermission: settings.aiLinksPermission,
      userDataPermission: settings.userDataPermission
    }),
    I: JSON.stringify(settings.commands),
    J: settings.aiData
  };
}

function showSaveLoader() {
  saveLoader.hidden = false;
  saveErrorClose.hidden = true;
  saveTitle.textContent = 'Сохраняем настройки';
  saveMessage.textContent = 'Пожалуйста, подождите.';
  saveBackdrop.hidden = false;
  document.body.style.overflow = 'hidden';
}

function showSaveError() {
  saveLoader.hidden = true;
  saveSuccessClose.hidden = true;
  saveTitle.textContent = 'Не удалось сохранить';
  saveMessage.textContent = 'Проверьте соединение и попробуйте ещё раз.';
  saveErrorClose.hidden = false;
}

function showSaveSuccess() {
  saveLoader.hidden = true;
  saveErrorClose.hidden = true;
  saveTitle.textContent = 'Данные успешно изменены';
  saveMessage.textContent = 'Настройки ИИ автоответчика сохранены.';
  saveSuccessClose.hidden = false;
}

async function updateBusinessData(settings) {
  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(buildBusinessPayload(settings))
  });

  const result = (await response.text()).trim();
  if (result !== 'Данные обновлены') {
    throw new Error(`GAS response: ${result}`);
  }
}

function applySettings(settings) {
  settingsForm.reset();
  renderCommands(settings.commands || []);

  Object.entries(settings).forEach(([name, value]) => {
    if (name === 'commands') return;
    const control = settingsForm.elements[name];
    if (!control) return;

    if (control instanceof RadioNodeList) {
      const radio = [...control].find(input => input.value === value);
      if (radio) radio.checked = true;
    } else {
      control.value = value;
    }
  });

  updateDependentInputs();
}

function sanitizeCommand(value) {
  return value.toLowerCase().replace(/[^a-z_]/g, '').slice(0, 20);
}

function getEmojiSegments(value) {
  if (emojiSegmenter) {
    return [...emojiSegmenter.segment(value)].map(item => item.segment);
  }

  return [...value];
}

function sanitizeEmoji(value) {
  return getEmojiSegments(value)
    .filter(segment => /\p{Extended_Pictographic}/u.test(segment))
    .slice(0, maxEmojis)
    .join('');
}

function countEmojis(value) {
  return getEmojiSegments(value)
    .filter(segment => /\p{Extended_Pictographic}/u.test(segment)).length;
}

function updateCommandsButton() {
  const commandCount = commandsList.querySelectorAll('.command-row').length;
  addCommandBtn.hidden = commandCount >= maxCommands;
  addCommandLabel.textContent = commandCount ? 'Добавить новую команду' : 'Добавить команду';
}

function updateCommandValidity() {
  const inputs = [...commandsList.querySelectorAll('.command-input')];
  const commandCounts = inputs.reduce((counts, input) => {
    const command = input.value;
    if (command) counts[command] = (counts[command] || 0) + 1;
    return counts;
  }, {});

  let isValid = true;
  inputs.forEach(input => {
    const row = input.closest('.command-row');
    const messageInput = row.querySelector('.command-message');
    const isDuplicate = input.value && commandCounts[input.value] > 1;
    const hasBoundaryUnderscore = /^_|_$/.test(input.value);
    const errorMessage = hasBoundaryUnderscore
      ? 'Символ _ нельзя использовать в начале или конце команды.'
      : isDuplicate
        ? 'Такая команда уже добавлена.'
        : '';
    input.setCustomValidity(errorMessage);
    input.classList.toggle('is-invalid', Boolean(errorMessage));
    row.querySelector('.command-error').textContent = errorMessage;
    row.querySelector('.command-error').hidden = !errorMessage;
    if (errorMessage || !input.value.trim() || !messageInput.value.trim()) isValid = false;
  });

  updateSaveButtonState(isValid);
  return isValid;
}

function updateSaveButtonState(commandsValid = true) {
  const customFieldsValid = [
    ['greetingMode', 'customGreeting'],
    ['thinkingMode', 'customThinking'],
    ['unknownAnswerMode', 'customUnknownAnswer'],
    ['emojiMode', 'customEmoji']
  ].every(([modeName, inputName]) => {
    const mode = settingsForm.elements[modeName].value;
    return mode !== 'custom' || settingsForm.elements[inputName].value.trim();
  });

  const hasChanges = JSON.stringify(readSettings()) !== JSON.stringify(savedSettings);
  const cooldownRemaining = getSaveCooldownRemaining();
  saveButton.disabled = !commandsValid || !customFieldsValid || !hasChanges || cooldownRemaining > 0;
  saveButton.textContent = cooldownRemaining > 0
    ? `Сохранить (${formatCooldown(cooldownRemaining)})`
    : 'Сохранить';
  saveButton.title = cooldownRemaining > 0
    ? `Сохранять данные можно 1 раз в 2 минуты.`
    : '';
}

function getSaveCooldownRemaining() {
  const lastSaveAt = Number(localStorage.getItem(lastSaveKey));
  if (!lastSaveAt) return 0;

  const remaining = saveCooldownMs - (Date.now() - lastSaveAt);
  if (remaining <= 0) {
    localStorage.removeItem(lastSaveKey);
    return 0;
  }

  return remaining;
}

function formatCooldown(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function refreshSaveCooldown() {
  clearTimeout(saveCooldownTimer);
  updateCommandValidity();

  const cooldownRemaining = getSaveCooldownRemaining();
  if (cooldownRemaining > 0) {
    saveCooldownTimer = setTimeout(refreshSaveCooldown, Math.min(cooldownRemaining, 1000));
  }
}

function createCommandRow(command = '', message = '') {
  const row = document.createElement('div');
  row.className = 'command-row';
  row.innerHTML = `
    <div class="command-name-wrap">
      <span class="command-prefix" aria-hidden="true">/</span>
      <input class="text-input command-input" type="text" maxlength="20" pattern="[a-z_]+" inputmode="lowercase" aria-label="Название команды" placeholder="команда" value="${command}">
    </div>
    <input class="text-input command-message" type="text" maxlength="200" aria-label="Сообщение команды" placeholder="Сообщение команды" value="${message}">
    <div class="command-error" hidden></div>
    <button class="delete-command-btn" type="button" aria-label="Удалить команду" title="Удалить команду">
      <i class="fa-solid fa-trash" style="color: rgb(116, 192, 252);"></i>
    </button>
  `;

  row.querySelector('.command-input').addEventListener('input', event => {
    event.target.value = sanitizeCommand(event.target.value);
    updateCommandValidity();
  });
  row.querySelector('.command-message').addEventListener('input', updateCommandValidity);
  row.querySelector('.delete-command-btn').addEventListener('click', () => {
    row.remove();
    updateCommandsButton();
    updateCommandValidity();
  });

  commandsList.append(row);
  updateCommandValidity();
}

function renderCommands(commands) {
  commandsList.replaceChildren();
  const uniqueCommands = new Set();
  commands.slice(0, maxCommands).forEach(item => {
    const command = sanitizeCommand(item.command || '');
    if (uniqueCommands.has(command)) return;
    uniqueCommands.add(command);
    createCommandRow(command, item.message || '');
  });
  updateCommandsButton();
}

function updateDependentInputs() {
  const greetingMode = settingsForm.elements.greetingMode.value;
  const thinkingMode = settingsForm.elements.thinkingMode.value;
  const unknownAnswerMode = settingsForm.elements.unknownAnswerMode.value;
  const emojiMode = settingsForm.elements.emojiMode.value;
  const greetingInput = settingsForm.elements.customGreeting;
  const thinkingInput = settingsForm.elements.customThinking;
  const unknownAnswerInput = settingsForm.elements.customUnknownAnswer;
  const emojiInput = settingsForm.elements.customEmoji;
  const aiDataInput = settingsForm.elements.aiData;

  greetingInput.disabled = greetingMode !== 'custom';
  thinkingInput.disabled = thinkingMode !== 'custom';
  unknownAnswerInput.disabled = unknownAnswerMode !== 'custom';
  emojiInput.disabled = emojiMode !== 'custom';
  document.getElementById('greetingCounter').hidden = greetingMode !== 'custom';
  document.getElementById('thinkingCounter').hidden = thinkingMode !== 'custom';
  document.getElementById('unknownAnswerCounter').hidden = unknownAnswerMode !== 'custom';
  document.getElementById('emojiCounter').hidden = emojiMode !== 'custom';
  updateCharacterCounter(greetingInput, document.getElementById('greetingCounter'));
  updateCharacterCounter(thinkingInput, document.getElementById('thinkingCounter'));
  updateCharacterCounter(unknownAnswerInput, document.getElementById('unknownAnswerCounter'));
  updateEmojiCounter(emojiInput, document.getElementById('emojiCounter'));
  updateCharacterCounter(aiDataInput, document.getElementById('aiDataCounter'));
  updateCommandValidity();
}

function updateCharacterCounter(input, counter) {
  counter.textContent = `${input.value.length}/${input.maxLength}`;
}

function updateEmojiCounter(input, counter) {
  counter.textContent = `${countEmojis(input.value)}/${maxEmojis}`;
}

function openManagement() {
  try {
    savedSettings = JSON.parse(localStorage.getItem(savedSettingsKey) || '{}');
  } catch {
    savedSettings = {};
  }

  applySettings(savedSettings);
  homeView.hidden = true;
  managementView.hidden = false;
  currentScreen = 'management';
  syncTelegramButtons();
}

function closeManagement() {
  managementView.hidden = true;
  homeView.hidden = false;
  currentScreen = 'home';
  syncTelegramButtons();
}

function getStatisticsUserId() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    || localStorage.getItem('AdminUserID')
    || '';
}

function getStatisticsCacheKey() {
  return `${statisticsCachePrefix}${getStatisticsUserId() || 'unknown'}`;
}

function getStatisticsCache() {
  try {
    return JSON.parse(localStorage.getItem(getStatisticsCacheKey()) || 'null');
  } catch {
    return null;
  }
}

function formatStatisticsCooldown(milliseconds) {
  const totalSeconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function updateStatisticsCooldown() {
  clearTimeout(statisticsCooldownTimer);
  const cache = getStatisticsCache();
  const remaining = cache ? statisticsCooldownMs - (Date.now() - cache.savedAt) : 0;
  const hasCooldown = remaining > 0;
  statisticsRefreshBtn.disabled = hasCooldown;
  statisticsCooldown.hidden = !hasCooldown;
  statisticsCooldown.textContent = hasCooldown
    ? `Обновить можно через ${formatStatisticsCooldown(remaining)}`
    : '';

  if (hasCooldown) {
    statisticsCooldownTimer = setTimeout(updateStatisticsCooldown, Math.min(remaining, 1000));
  }
}

function showStatisticsCache(cache) {
  clientsCount.textContent = parseStatisticsResponse(String(cache.value ?? ''));
  statisticsLoader.hidden = true;
  statisticsPanel.hidden = false;
  updateStatisticsCooldown();
}

function parseStatisticsResponse(responseText) {
  const text = responseText.trim();
  let value = text;

  try {
    const data = JSON.parse(text);
    value = typeof data === 'number' || typeof data === 'string'
      ? data
      : data?.clients ?? data?.count ?? data?.value ?? data?.total ?? data?.['Значение'];
  } catch {
    value = text.replace(/^(?:значение|value|clients|count|total)\s*:\s*/i, '');
  }

  return value === null || value === undefined || String(value).trim() === '' ? 0 : value;
}

async function loadStatistics(force = false) {
  const cache = getStatisticsCache();
  const cacheIsFresh = cache && Date.now() - cache.savedAt < statisticsCooldownMs;
  if (!force && cacheIsFresh) {
    showStatisticsCache(cache);
    return;
  }

  statisticsPanel.hidden = true;
  statisticsLoader.hidden = false;
  statisticsRefreshBtn.disabled = true;

  try {
    const userId = getStatisticsUserId();
    const url = `${statisticsUrl}?id=${encodeURIComponent(userId)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const value = parseStatisticsResponse(await response.text());
    const nextCache = { value, savedAt: Date.now() };
    localStorage.setItem(getStatisticsCacheKey(), JSON.stringify(nextCache));
    showStatisticsCache(nextCache);
  } catch (error) {
    console.error('Не удалось загрузить статистику:', error);
    statisticsLoader.hidden = true;
    statisticsPanel.hidden = false;
    clientsCount.textContent = '0';
    statisticsRefreshBtn.disabled = false;
  }
}

function openStatistics(origin = currentScreen) {
  statisticsOrigin = origin === 'management' ? 'management' : 'home';
  homeView.hidden = true;
  managementView.hidden = true;
  appSettingsView.hidden = true;
  statisticsView.hidden = false;
  currentScreen = 'statistics';
  const cache = getStatisticsCache();
  if (cache) showStatisticsCache(cache);
  else loadStatistics();
  syncTelegramButtons();
}

function closeStatistics() {
  statisticsView.hidden = true;
  managementView.hidden = statisticsOrigin !== 'management';
  homeView.hidden = statisticsOrigin === 'management';
  currentScreen = statisticsOrigin;
  syncTelegramButtons();
}

function openAppSettings(origin = currentScreen) {
  appSettingsOrigin = origin === 'management' ? 'management' : 'home';
  homeView.hidden = true;
  managementView.hidden = true;
  statisticsView.hidden = true;
  appSettingsView.hidden = false;
  telegramId.textContent = telegramUserId;
  applyAppSettings();
  syncTelegramButtons();
}

function closeAppSettings() {
  appSettingsView.hidden = true;
  managementView.hidden = appSettingsOrigin !== 'management';
  homeView.hidden = appSettingsOrigin === 'management';
  currentScreen = appSettingsOrigin;
  syncTelegramButtons();
}

function getLocalAppSettings() {
  try {
    return JSON.parse(localStorage.getItem(appSettingsKey) || '{}');
  } catch {
    return {};
  }
}

function getAppSettings() {
  return getLocalAppSettings();
}

function saveAppSettings(settings) {
  localStorage.setItem(appSettingsKey, JSON.stringify(settings));
}

function applyAppSettings() {
  const settings = getAppSettings();
  const isFullscreen = settings.size === 'fullscreen';
  const closingConfirmation = settings.closingConfirmation !== false;
  const topbarPosition = Math.min(100, Math.max(-20, Number(settings.topbarPosition) || 0));
  windowedBtn.classList.toggle('active', !isFullscreen);
  fullscreenBtn.classList.toggle('active', isFullscreen);
  windowedBtn.setAttribute('aria-pressed', String(!isFullscreen));
  fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
  closingConfirmOnBtn.classList.toggle('active', closingConfirmation);
  closingConfirmOffBtn.classList.toggle('active', !closingConfirmation);
  closingConfirmOnBtn.setAttribute('aria-pressed', String(closingConfirmation));
  closingConfirmOffBtn.setAttribute('aria-pressed', String(!closingConfirmation));
  topbarPositionInput.value = String(topbarPosition);
  topbarPositionValue.value = `${topbarPosition} px`;
  topbarPositionValue.textContent = `${topbarPosition} px`;
  document.documentElement.style.setProperty('--topbar-position', `${topbarPosition}px`);
}

function setTopbarPosition(value) {
  const settings = getAppSettings();
  settings.topbarPosition = Number(value);
  saveAppSettings(settings);
  applyAppSettings();
}

function setClosingConfirmation(enabled) {
  const settings = getAppSettings();
  settings.closingConfirmation = enabled;
  saveAppSettings(settings);
  applyAppSettings();
  if (enabled) {
    window.Telegram?.WebApp?.enableClosingConfirmation?.();
  } else {
    window.Telegram?.WebApp?.disableClosingConfirmation?.();
  }
}

async function copyTelegramId() {
  try {
    await navigator.clipboard.writeText(telegramId.textContent);
  } catch {
    const fallback = document.createElement('textarea');
    fallback.value = telegramId.textContent;
    fallback.setAttribute('readonly', '');
    fallback.style.position = 'fixed';
    fallback.style.opacity = '0';
    document.body.append(fallback);
    fallback.select();
    document.execCommand('copy');
    fallback.remove();
  }

  copyTelegramIdBtn.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>
    <span>Скопировано!</span>
  `;
  copyTelegramIdBtn.disabled = true;
  setTimeout(() => {
    copyTelegramIdBtn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="10" height="10" rx="1"/><path d="M6 15H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1"/></svg>
      <span>Скопировать</span>
    `;
    copyTelegramIdBtn.disabled = false;
  }, 3000);
}

async function setFullscreen(enabled) {
  const settings = getAppSettings();
  settings.size = enabled ? 'fullscreen' : 'windowed';
  saveAppSettings(settings);
  applyAppSettings();
  await applyFullscreenMode(enabled);
}

async function applyFullscreenMode(enabled) {
  if (!telegramWebApp) return;

  try {
    telegramWebApp.ready?.();
    if (enabled) {
      telegramWebApp.requestFullscreen?.();
    } else {
      telegramWebApp.exitFullscreen?.();
    }
  } catch (error) {
    console.error('Не удалось применить полноэкранный режим:', error);
  }
}

function requestCloseManagement() {
  if (JSON.stringify(readSettings()) !== JSON.stringify(savedSettings)) {
    confirmBackdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    return;
  }

  closeManagement();
}

function keepEditing() {
  confirmBackdrop.hidden = true;
  document.body.style.overflow = '';
}

document.getElementById('manageBtn').addEventListener('click', openManagement);
statisticsBtn.addEventListener('click', () => openStatistics(currentScreen));
statisticsBackBtn.addEventListener('click', closeStatistics);
statisticsRefreshBtn.addEventListener('click', () => loadStatistics(true));
document.getElementById('settingsBtn').addEventListener('click', () => openAppSettings(currentScreen));
appSettingsBackBtn.addEventListener('click', closeAppSettings);
windowedBtn.addEventListener('click', () => setFullscreen(false));
fullscreenBtn.addEventListener('click', () => setFullscreen(true));
closingConfirmOnBtn.addEventListener('click', () => setClosingConfirmation(true));
closingConfirmOffBtn.addEventListener('click', () => setClosingConfirmation(false));
copyTelegramIdBtn.addEventListener('click', copyTelegramId);
topbarPositionInput.addEventListener('input', event => setTopbarPosition(event.target.value));
addCommandBtn.addEventListener('click', () => {
  if (commandsList.querySelectorAll('.command-row').length < maxCommands) {
    createCommandRow();
    updateCommandsButton();
    commandsList.lastElementChild.querySelector('.command-input').focus();
  }
});
settingsForm.addEventListener('keydown', event => {
  if (event.key === 'Enter' && event.target.matches('input:not([type="radio"])')) {
    event.preventDefault();
  }
});
settingsForm.addEventListener('change', updateDependentInputs);
settingsForm.elements.customGreeting.addEventListener('input', () => {
  updateCharacterCounter(settingsForm.elements.customGreeting, document.getElementById('greetingCounter'));
  updateCommandValidity();
});
settingsForm.elements.customThinking.addEventListener('input', () => {
  updateCharacterCounter(settingsForm.elements.customThinking, document.getElementById('thinkingCounter'));
  updateCommandValidity();
});
settingsForm.elements.customUnknownAnswer.addEventListener('input', () => {
  updateCharacterCounter(settingsForm.elements.customUnknownAnswer, document.getElementById('unknownAnswerCounter'));
  updateCommandValidity();
});
settingsForm.elements.customEmoji.addEventListener('input', event => {
  event.target.value = sanitizeEmoji(event.target.value);
  updateEmojiCounter(event.target, document.getElementById('emojiCounter'));
  updateCommandValidity();
});
settingsForm.elements.aiData.addEventListener('input', () => {
  updateCharacterCounter(settingsForm.elements.aiData, document.getElementById('aiDataCounter'));
  updateCommandValidity();
});
settingsForm.addEventListener('submit', event => {
  event.preventDefault();
  if (!updateCommandValidity()) {
    settingsForm.reportValidity();
    return;
  }
  const settings = readSettings();
  saveButton.disabled = true;
  showSaveLoader();
  updateBusinessData(settings)
    .then(() => {
      savedSettings = settings;
      localStorage.setItem(savedSettingsKey, JSON.stringify(savedSettings));
      localStorage.setItem(lastSaveKey, String(Date.now()));
      refreshSaveCooldown();
      showSaveSuccess();
    })
    .catch(error => {
      console.error('Ошибка при отправке запроса:', error);
      updateCommandValidity();
      showSaveError();
    });
});
saveErrorClose.addEventListener('click', () => {
  saveBackdrop.hidden = true;
  document.body.style.overflow = '';
});
saveSuccessClose.addEventListener('click', () => {
  saveBackdrop.hidden = true;
  document.body.style.overflow = '';
  closeManagement();
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) refreshSaveCooldown();
});
window.addEventListener('pageshow', refreshSaveCooldown);
window.addEventListener('focus', refreshSaveCooldown);
refreshSaveCooldown();
document.getElementById('cancelBtn').addEventListener('click', requestCloseManagement);
document.getElementById('backBtn').addEventListener('click', requestCloseManagement);
document.getElementById('confirmCancel').addEventListener('click', keepEditing);
confirmBackdrop.addEventListener('click', event => {
  if (event.target === confirmBackdrop) keepEditing();
});
document.getElementById('confirmDiscard').addEventListener('click', () => {
  applySettings(savedSettings);
  keepEditing();
  closeManagement();
});

function initializeAppSettings() {
  const settings = getAppSettings();
  if (settings.closingConfirmation !== false) {
    window.Telegram?.WebApp?.enableClosingConfirmation?.();
  } else {
    window.Telegram?.WebApp?.disableClosingConfirmation?.();
  }
  applyAppSettings();
  applyFullscreenMode(settings.size === 'fullscreen');
}

telegramWebApp?.ready?.();
initializeAppSettings();
syncTelegramButtons();