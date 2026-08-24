const modalBackdrop = document.getElementById('modalBackdrop');
const connectBtn = document.getElementById('connectBtn');
const modalClose = document.getElementById('modalClose');
const instructions = document.getElementById('instructions');
const tabs = [...document.querySelectorAll('.tab')];
const homeView = document.getElementById('homeView');
const managementView = document.getElementById('managementView');
const settingsForm = document.getElementById('settingsForm');
const confirmBackdrop = document.getElementById('confirmBackdrop');
const commandsList = document.getElementById('commandsList');
const addCommandBtn = document.getElementById('addCommandBtn');
const addCommandLabel = document.getElementById('addCommandLabel');
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
const webAppUrl = 'https://script.google.com/macros/s/AKfycbwXkAdkTc4n_4FtuAHvxfzJCiDHgkS3rLDZqEAKucp2LvRsKxUGacJuMmxLNQhUk4U17A/exec';
const maxCommands = 3;
const maxEmojis = 100;
const emojiSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
  : null;
let savedSettings = {};
let saveCooldownTimer;

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

  const video = instructions.querySelector('video');

  video?.play().catch(() => {});
}

function closeModal() {
  modalBackdrop.hidden = true;
  document.body.style.overflow = '';
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
    business_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id || '6434781065',
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
}

function closeManagement() {
  managementView.hidden = true;
  homeView.hidden = false;
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

document.getElementById('settingsBtn').addEventListener('click', () => {
  // Кнопка настроек присутствует по требованию.
  // Отдельное меню не добавляем.
});