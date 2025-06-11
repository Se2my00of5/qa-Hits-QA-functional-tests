const priorityMacros = {
	'!1': 'Critical',
	'!2': 'High',
	'!3': 'Medium',
	'!4': 'Low'
};
// Обработка макросов (!1, !before и т.д.)
export function parseMacros(title, priorityField, deadlineField) {
	let result = macrosPriority(title, priorityField);
	let result1 = macrosDeadline(result.title, deadlineField);

	return {
		updatedTitle: result1.title,
		priority: result.priority,
		deadline: result1.deadline,
	};
}
// Обработка приоритета
export function macrosPriority(title, priorityField) {
	let priority = priorityField;

	const match = title.match(/!(1|2|3|4)/);
	if (match && !priority) {
			const macro = `!${match[1]}`;
			priority = priorityMacros[macro];
			title = title.replace(macro, '').trim();
	}
	return { title, priority };
}
// Обработка дедлайна
export function macrosDeadline(title, deadlineField) {
	let deadline = deadlineField;

	const deadlineMatch = title.match(/!before (\d{2}[-.]\d{2}[-.]\d{4})/);
	if (deadlineMatch && parseCustomDate(deadlineMatch[1]) && !deadline) {
		const [day, month, year] = deadlineMatch[1].split(/[.-]/);
		deadline = `${year}-${month}-${day}`;
		title = title.replace(deadlineMatch[0], '').trim();
	}

	return { title, deadline };
}

function parseCustomDate(str) {
	const strMatch = str.match(/(\d{2})[.\-](\d{2})[.\-](\d{4})/);
  
	const [, day, month, year] = strMatch.map(Number);
	const date = new Date(year, month - 1, day);
  
	// Проверка на корректность
	return (
	  date.getFullYear() === year &&
	  date.getMonth() === month - 1 &&
	  date.getDate() === day
	) ? date : null;
  }
