// Expense Calculator App
class ExpenseCalculator {
    constructor() {
        this.expenses = this.loadExpenses();
        this.initializeEventListeners();
        this.updateDisplay();
    }

    // Load expenses from localStorage
    loadExpenses() {
        const stored = localStorage.getItem('expenses');
        return stored ? JSON.parse(stored) : [];
    }

    // Save expenses to localStorage
    saveExpenses() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    // Initialize event listeners
    initializeEventListeners() {
        const form = document.getElementById('expense-form');
        const exportBtn = document.getElementById('export-btn');
        const clearBtn = document.getElementById('clear-btn');

        form.addEventListener('submit', (e) => this.handleAddExpense(e));
        exportBtn.addEventListener('click', () => this.exportData());
        clearBtn.addEventListener('click', () => this.clearAllExpenses());
    }

    // Handle adding new expense
    handleAddExpense(e) {
        e.preventDefault();
        
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const paidBy = document.getElementById('paid-by').value;

        if (!description || !amount || !paidBy) {
            alert('Please fill in all fields');
            return;
        }

        const expense = {
            id: Date.now().toString(),
            description,
            amount,
            paidBy,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        };

        this.expenses.unshift(expense); // Add to beginning of array
        this.saveExpenses();
        this.updateDisplay();
        
        // Reset form
        e.target.reset();
        
        // Show success feedback
        this.showNotification('Expense added successfully!');
    }

    // Calculate balances
    calculateBalances() {
        let sharathTotal = 0;
        let thejasTotal = 0;
        let sharathPaid = 0;
        let thejasPaid = 0;

        this.expenses.forEach(expense => {
            const amount = expense.amount;
            const splitAmount = amount / 2; // Equal split

            // Add to total expenses for each person
            sharathTotal += splitAmount;
            thejasTotal += splitAmount;

            // Track who paid what
            if (expense.paidBy === 'sharath') {
                sharathPaid += amount;
            } else {
                thejasPaid += amount;
            }
        });

        // Calculate net balances (what each person owes/is owed)
        const sharathBalance = sharathPaid - sharathTotal;
        const thejasBalance = thejasPaid - thejasTotal;

        return {
            sharath: sharathBalance,
            thejas: thejasBalance,
            sharathPaid,
            thejasPaid,
            totalExpenses: sharathTotal + thejasTotal
        };
    }

    // Update display
    updateDisplay() {
        this.updateBalanceDisplay();
        this.updateExpensesList();
    }

    // Update balance display
    updateBalanceDisplay() {
        const balances = this.calculateBalances();
        
        const sharathBalanceEl = document.getElementById('sharath-balance');
        const thejasBalanceEl = document.getElementById('thejas-balance');
        const settlementEl = document.getElementById('settlement');

        // Update balance amounts
        sharathBalanceEl.textContent = `$${Math.abs(balances.sharath).toFixed(2)}`;
        thejasBalanceEl.textContent = `$${Math.abs(balances.thejas).toFixed(2)}`;

        // Add positive/negative classes
        sharathBalanceEl.className = 'amount';
        thejasBalanceEl.className = 'amount';

        if (balances.sharath > 0) {
            sharathBalanceEl.classList.add('positive');
        } else if (balances.sharath < 0) {
            sharathBalanceEl.classList.add('negative');
        }

        if (balances.thejas > 0) {
            thejasBalanceEl.classList.add('positive');
        } else if (balances.thejas < 0) {
            thejasBalanceEl.classList.add('negative');
        }

        // Update settlement message
        if (Math.abs(balances.sharath) < 0.01) {
            settlementEl.textContent = "All settled up! 🎉";
            settlementEl.className = 'settlement';
        } else if (balances.sharath > 0) {
            settlementEl.textContent = `Thejas owes Sharath $${balances.sharath.toFixed(2)}`;
            settlementEl.className = 'settlement';
        } else {
            settlementEl.textContent = `Sharath owes Thejas $${Math.abs(balances.sharath).toFixed(2)}`;
            settlementEl.className = 'settlement';
        }
    }

    // Update expenses list
    updateExpensesList() {
        const expensesList = document.getElementById('expenses-list');
        
        if (this.expenses.length === 0) {
            expensesList.innerHTML = '<div class="no-expenses">No expenses added yet</div>';
            return;
        }

        const expensesHTML = this.expenses.map(expense => `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-details">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-meta">
                        Paid by ${expense.paidBy === 'sharath' ? 'Sharath' : 'Thejas'} • ${this.formatDate(expense.date)}
                    </div>
                </div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                    <button class="btn-small btn-edit" onclick="app.editExpense('${expense.id}')">Edit</button>
                    <button class="btn-small btn-delete" onclick="app.deleteExpense('${expense.id}')">Delete</button>
                </div>
            </div>
        `).join('');

        expensesList.innerHTML = expensesHTML;
    }

    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
    }

    // Edit expense
    editExpense(id) {
        const expense = this.expenses.find(exp => exp.id === id);
        if (!expense) return;

        const newDescription = prompt('Edit description:', expense.description);
        if (newDescription === null) return;

        const newAmount = prompt('Edit amount:', expense.amount);
        if (newAmount === null) return;

        const parsedAmount = parseFloat(newAmount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('Please enter a valid amount');
            return;
        }

        const newPaidBy = prompt('Paid by (sharath/thejas):', expense.paidBy);
        if (newPaidBy === null) return;

        if (newPaidBy !== 'sharath' && newPaidBy !== 'thejas') {
            alert('Please enter either "sharath" or "thejas"');
            return;
        }

        // Update expense
        expense.description = newDescription.trim();
        expense.amount = parsedAmount;
        expense.paidBy = newPaidBy;

        this.saveExpenses();
        this.updateDisplay();
        this.showNotification('Expense updated successfully!');
    }

    // Delete expense
    deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveExpenses();
        this.updateDisplay();
        this.showNotification('Expense deleted successfully!');
    }

    // Export data
    exportData() {
        const data = {
            expenses: this.expenses,
            exportDate: new Date().toISOString(),
            balances: this.calculateBalances()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `expense-data-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showNotification('Data exported successfully!');
    }

    // Clear all expenses
    clearAllExpenses() {
        if (!confirm('Are you sure you want to clear all expenses? This cannot be undone.')) return;

        this.expenses = [];
        this.saveExpenses();
        this.updateDisplay();
        this.showNotification('All expenses cleared!');
    }

    // Show notification
    showNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 600;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideIn 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ExpenseCalculator();
});

// Add CSS for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
