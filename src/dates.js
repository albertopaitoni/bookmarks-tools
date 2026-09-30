export function formatTreeDates(nodes, formatType) {
  return nodes.map(node => {
    const formattedNode = { ...node };
    if (formattedNode.type === 'bookmark') {
      if (!formattedNode.rawAddDate) {
        formattedNode.rawAddDate = node.rawAddDate || node.addDate;
      }
      formattedNode.addDate = formatSingleDate(formattedNode.rawAddDate, formatType);
    } else if (formattedNode.type === 'folder' && formattedNode.children) {
      formattedNode.children = formatTreeDates(formattedNode.children, formatType);
    }
    return formattedNode;
  });
}

export function formatSingleDate(isoDateStr, formatType) {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return isoDateStr;
  
  if (formatType === 'unix') {
    return Math.floor(date.getTime() / 1000).toString();
  } else if (formatType === 'locale') {
    return date.toLocaleString('it-IT');
  }
  // Default: ISO String
  return date.toISOString();
}

