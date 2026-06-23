export interface VacancyCardData {
  position: string;
  description: string;
  requirements: string[];
  conditions: string[];
}

export async function drawVacancyCardToCanvas(data: VacancyCardData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  // Instagram feed posts are square (1080x1080)
  canvas.width = 1080;
  canvas.height = 1080;

  // Background - dark gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, 1080);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1080);

  // Red accent line at top
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(0, 0, 1080, 12);

  // Header section
  ctx.fillStyle = '#CC0000';
  ctx.font = 'bold 48px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('TASHENEV UNIVERSITY', 60, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 36px Arial';
  ctx.fillText('Вакансия', 60, 160);

  ctx.fillStyle = '#CC0000';
  ctx.font = 'bold 100px Arial';
  ctx.fillText('МЫ ИЩЕМ', 60, 280);

  // Position title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px Arial';
  ctx.fillText(data.position || 'Должность', 60, 380);

  // Divider line
  ctx.fillStyle = '#e5e5e5';
  ctx.fillRect(60, 420, 960, 4);

  // Content section
  let y = 480;

  // Description
  ctx.fillStyle = '#ffffff';
  ctx.font = '32px Arial';
  ctx.textAlign = 'left';
  const descLines = wrapText(ctx, data.description || 'Описание роли', 900, 40);
  descLines.forEach(line => {
    ctx.fillText(line, 60, y);
    y += 48;
  });

  y += 30;

  // Requirements
  ctx.fillStyle = '#CC0000';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Требования:', 60, y);
  y += 50;

  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  data.requirements.slice(0, 4).forEach(req => {
    if (req.trim()) {
      ctx.fillText(`• ${req.trim()}`, 80, y);
      y += 40;
    }
  });

  y += 30;

  // Conditions
  ctx.fillStyle = '#CC0000';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Условия:', 60, y);
  y += 50;

  ctx.fillStyle = '#ffffff';
  ctx.font = '28px Arial';
  data.conditions.slice(0, 3).forEach(cond => {
    if (cond.trim()) {
      ctx.fillText(`• ${cond.trim()}`, 80, y);
      y += 40;
    }
  });

  // Footer
  ctx.fillStyle = '#CC0000';
  ctx.fillRect(0, 980, 1080, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = '600 32px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('hr@tashenev.edu', 60, 1040);
  ctx.textAlign = 'right';
  ctx.fillText('tashenev.edu', 1020, 1040);

  // Convert to blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/jpeg', 0.92);
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, lineHeight: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
