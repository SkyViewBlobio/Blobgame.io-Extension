export function renderExtensionTooltip(document, tooltip, text) {
  if (!tooltip) {
    return false;
  }

  while (tooltip.firstChild || tooltip.children?.length) {
    tooltip.removeChild(tooltip.firstChild || tooltip.children[0]);
  }

  const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
  for (const line of lines) {
    tooltip.appendChild(createTooltipLine(document, line));
  }

  return lines.length > 0;
}

function createTooltipLine(document, line) {
  const metric = line.match(/^FPS-(Impact|Gain):\s*([A-Za-z]+)\[([^\]]+)\]$/);
  const warning = line.match(/^\[(WARNING:[^\]]+)\]$/);
  const item = document.createElement('div');
  item.classList.add('blobio-extension-tooltip-line');

  if (metric) {
    appendMetricLine(document, item, metric);
    return item;
  }

  if (warning) {
    item.classList.add('blobio-extension-tooltip-warning');
    item.textContent = `[${warning[1]}]`;
    return item;
  }

  item.textContent = line;
  return item;
}

function appendMetricLine(document, item, metric) {
  const metricKind = metric[1].toLowerCase();
  const levelKind = metric[2].toLowerCase();
  item.classList.add('blobio-extension-tooltip-metric', `is-${metricKind}`, `is-level-${levelKind}`);

  const label = document.createElement('span');
  label.classList.add('blobio-extension-tooltip-metric-label');
  label.textContent = `FPS-${metric[1]}: `;

  const level = document.createElement('span');
  level.classList.add('blobio-extension-tooltip-metric-level', `is-${levelKind}`);
  level.textContent = metric[2];

  const range = document.createElement('span');
  range.classList.add('blobio-extension-tooltip-metric-range');
  range.textContent = `[${metric[3]}]`;

  item.append(label, level, range);
}
