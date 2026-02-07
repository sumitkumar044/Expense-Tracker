let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let myChart = null;
let darkMode = localStorage.getItem('darkMode') === 'true';

const CATEGORIES = {
    'Food': '#ef4444',
    'Travel': '#f59e0b',
    'Bills': '#10b981',
    'Salary': '#3b82f6',
    'Shopping': '#8b5cf6',
    'Other': '#ec4899'
};

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', function() {
    const darkToggle = document.getElementById('darkToggle');
    if (darkMode) {
        document.body.classList.add('dark-mode');
        darkToggle.checked = true;
    }
    
    darkToggle.addEventListener('change', function() {
        darkMode = this.checked;
        document.body.classList.toggle('dark-mode', darkMode);
        localStorage.setItem('darkMode', darkMode);
    });

    document.getElementById('transactionForm').addEventListener('submit', addTransaction);
    updateSummary();
    updateList();
    updateChart();
});

function addTransaction(e) {
    e.preventDefault();
    
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];

    if (!amount || amount <= 0) {
        showNotification('Please enter valid amount', 'error');
        return;
    }

    const transaction = {
        id: Date.now(),
        amount,
        type,
        category,
        date,
        color: CATEGORIES[category] || '#6b7280'
    };

    transactions.unshift(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    
    // Reset form
    document.getElementById('amount').value = '';
    document.getElementById('date').value = '';
    
    showNotification('Transaction added successfully!', 'success');
    updateSummary();
    updateList();
    updateChart();
}

function deleteTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    localStorage.setItem('transactions', JSON.stringify(transactions));
    updateSummary();
    updateList();
    updateChart();
    showNotification('Transaction deleted!', 'warning');
}

function exportCSV() {
    const csv = [
        ['Date', 'Type', 'Category', 'Amount (₹)'],
        ...transactions.map(t => [
            new Date(t.date).toLocaleDateString('en-IN'),
            t.type.toUpperCase(),
            t.category,
            t.amount
        ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showNotification('Data exported successfully!', 'success');
}

function filterMonth() {
    const month = document.getElementById('monthFilter').value;
    const filtered = month ? 
        transactions.filter(t => t.date.startsWith(month)) : transactions;
    updateList(filtered);
}

function updateSummary() {
    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    document.getElementById('totalIncome').textContent = `₹${income.toLocaleString('en-IN')}`;
    document.getElementById('totalExpense').textContent = `₹${expense.toLocaleString('en-IN')}`;
    document.getElementById('balance').textContent = `₹${(income - expense).toLocaleString('en-IN')}`;
}

function updateList(filteredTransactions = transactions) {
    const list = document.getElementById('transactionList');
    const recent = filteredTransactions.slice(0, 10);
    
    if (recent.length === 0) {
        list.innerHTML = '<li class="empty-state">No transactions yet. Add one above! 🎉</li>';
        return;
    }
    
    list.innerHTML = recent.map(t => `
        <li class="transaction-item transaction-${t.type}" style="border-left-color: ${t.color}">
            <div class="transaction-info">
                <div class="date">${new Date(t.date).toLocaleDateString('en-IN')}</div>
                <div class="category">${t.category}</div>
            </div>
            <div class="transaction-amount">
                <span>${t.type === 'income' ? '+' : '-' }₹${t.amount.toLocaleString('en-IN')}</span>
                <button onclick="deleteTransaction(${t.id})" class="delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </li>
    `).join('');
}

function updateChart() {
    const canvas = document.getElementById('expenseChart');
    const ctx = canvas.getContext('2d');
    
    const expenseData = {};
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    expenseTransactions.forEach(t => {
        expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
    });
    
    if (myChart) myChart.destroy();
    
    if (Object.keys(expenseData).length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.fillStyle = darkMode ? '#475569' : '#e2e8f0';
        ctx.textAlign = 'center';
        ctx.font = 'bold 24px Poppins';
        ctx.fillText('No expenses yet', canvas.width / 2, canvas.height / 2);
        ctx.font = '16px Poppins';
        ctx.fillText('Add expenses to see breakdown', canvas.width / 2, canvas.height / 2 + 30);
        ctx.restore();
        return;
    }
    
    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expenseData),
            datasets: [{
                data: Object.values(expenseData),
                backgroundColor: Object.values(CATEGORIES).slice(0, Object.keys(expenseData).length),
                borderWidth: 4,
                borderColor: '#ffffff',
                hoverOffset: 15,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: { 
                    position: 'bottom',
                    labels: { 
                        padding: 30,
                        usePointStyle: true,
                        font: { size: 14 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return `${context.label}: ₹${context.parsed.toLocaleString('en-IN')} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
        ${message}
    `;
    document.querySelector('.container').appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}
