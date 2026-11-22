case '!style': {
  const name = words.slice(1).join(' ');
  if (!name) { reply(gameHelp.style); break; }
  const itemId = styleArguments.get(name) ?? name;
  const owned = inventory(p.d);
  if (itemId === 'owned') {
    const list = owned.map(id => accessories[id].name).join(', ');
    fx(p, list || 'Инвентарь пуст');
    reply('🎒 Ранее приобретённые украшения — ' + (list || 'пока пусто') + '.');
    persist();
    break;
  }
  if (itemId === 'none') {
    p.d.style = 'none';
    reward(p, 0, 0);
    reply('✨ Аксессуар снят.');
    break;
  }
  if (!Object.hasOwn(accessories, itemId)) {
    reply('👑 Такого украшения нет. Список и цены — !справка украшения.');
    break;
  }
  const item = accessories[itemId];
  if (p.d.gold < item.cost) {
    fx(p, 'Нужно ' + item.cost + ' ✦');
    reply('🪙 Для «' + item.name + '» нужно ' + item.cost + ' золота. У тебя ' + p.d.gold + '.');
    break;
  }
  const alreadyOwned = owned.includes(itemId);
  if (!alreadyOwned) owned.push(itemId);
  p.d.style = itemId;
  reward(p, 0, -item.cost);
  fx(p, item.name + ' −' + item.cost + ' ✦');
  reply((alreadyOwned ? '✨ Повторно надет предмет «' : '🛍 Куплен и надет предмет «') +
    item.name + '». Списано ' + item.cost + ' золота. Баланс — ' + p.d.gold + '.');
  break;
}
