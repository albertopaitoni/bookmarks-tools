import { escapeCSV, escapeMarkdown, markdownLink } from './export-utils.js';

export function generateCSV(flatData) {
  const headers = ['Indice', 'Cartella', 'Titolo', 'URL Link', 'Data Aggiunta'];
  const rows = flatData.map((b, i) => {
    return [
      (i + 1).toString(),
      b.folderPath.join(' / '),
      b.title,
      b.url,
      b.addDate || ''
    ];
  });
  
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
  
  return csvContent;
}

export function generateMarkdown(treeData) {
  let md = '# I Miei Preferiti\n\n';
  
  function buildMDList(nodes, level = 1) {
    nodes.forEach(node => {
      if (node.type === 'folder') {
        const hash = '#'.repeat(Math.min(level + 1, 6));
        md += `${hash} ${escapeMarkdown(node.title)}\n\n`;
        buildMDList(node.children, level + 1);
      } else if (node.type === 'bookmark') {
        md += `* ${markdownLink(node.title, node.url)}\n`;
      }
    });
    // Aggiunge riga vuota alla fine di ogni livello cartella
    md += '\n';
  }
  
  buildMDList(treeData, 1);
  return md.trim();
}

export function generateSQL(flatData) {
  let sql = `-- Tabella creata per preferiti Bookmarks Tools\n`;
  sql += `CREATE TABLE IF NOT EXISTS preferiti (\n`;
  sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  percorso_cartella TEXT,\n`;
  sql += `  titolo VARCHAR(512),\n`;
  sql += `  url TEXT,\n`;
  sql += `  data_aggiunta VARCHAR(50)\n`;
  sql += `);\n\n`;
  
  if (flatData.length === 0) return sql;
  
  // Dividiamo in blocchi di 500 inserimenti per evitare query gigantesche
  const chunkSize = 500;
  for (let i = 0; i < flatData.length; i += chunkSize) {
    const chunk = flatData.slice(i, i + chunkSize);
    sql += `INSERT INTO preferiti (percorso_cartella, titolo, url, data_aggiunta) VALUES\n`;
    
    const valueLines = chunk.map(b => {
      const folder = b.folderPath.join(' / ').replace(/'/g, "''");
      const title = b.title.replace(/'/g, "''");
      const url = b.url.replace(/'/g, "''");
      const date = (b.addDate || '').replace(/'/g, "''");
      return `  ('${folder}', '${title}', '${url}', '${date}')`;
    });
    
    sql += valueLines.join(',\n') + ';\n\n';
  }
  
  return sql.trim();
}

