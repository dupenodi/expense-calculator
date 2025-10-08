// Expense Calculator App with Google Sheets Integration
class ExpenseCalculator {
    constructor() {
        this.expenses = [];
        this.searchTerm = '';
        this.sheetId = localStorage.getItem('sheetId');
        this.isOnline = navigator.onLine;
        
        // Initialize Google Sheets API
        this.initializeGoogleAPI();
        
        // Load data and initialize
        this.loadData();
        this.initializeEventListeners();
        this.updateDisplay();
        
        // Set up online/offline detection
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    // Initialize Google Sheets API
    async initializeGoogleAPI() {
        try {
            await new Promise((resolve) => {
                gapi.load('client', resolve);
            });
            
            await gapi.client.init({
                apiKey: 'AIzaSyBqJ8J8J8J8J8J8J8J8J8J8J8J8J8J8J8J', // We'll use a simpler approach
                discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
            });
            
            console.log('Google Sheets API initialized');
        } catch (error) {
            console.log('Google API not available, using localStorage fallback');
            this.useLocalStorage = true;
        }
    }

    // Load data from Google Sheets or localStorage
    async loadData() {
        if (!this.sheetId) {
            this.showSetupCard();
            return;
        }

        try {
            if (this.isOnline && !this.useLocalStorage) {
                await this.loadFromGoogleSheets();
            } else {
                this.loadFromLocalStorage();
            }
        } catch (error) {
            console.log('Failed to load from Google Sheets, using localStorage');
            this.loadFromLocalStorage();
        }
    }

    // Load expenses from localStorage (fallback)
    loadFromLocalStorage() {
        const stored = localStorage.getItem('expenses');
        this.expenses = stored ? JSON.parse(stored) : [];
    }

    // Load from Google Sheets (simplified approach using CSV)
    async loadFromGoogleSheets() {
        if (!this.sheetId) return;
        
        try {
            // Use the public CSV export URL for Google Sheets
            const csvUrl = `https://docs.google.com/spreadsheets/d/${this.sheetId}/export?format=csv&gid=0`;
            const response = await fetch(csvUrl);
            const csvText = await response.text();
            
            this.expenses = this.parseCSVToExpenses(csvText);
            this.saveToLocalStorage(); // Keep local backup
        } catch (error) {
            console.log('Error loading from Google Sheets:', error);
            this.loadFromLocalStorage();
        }
    }

    // Parse CSV data to expenses array
    parseCSVToExpenses(csvText) {
        const lines = csvText.split('\n');
        const expenses = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = this.parseCSVLine(line);
            if (columns.length >= 8) {
                expenses.push({
                    id: columns[0] || Date.now().toString(),
                    description: columns[1] || '',
                    amount: parseFloat(columns[2]) || 0,
                    paidBy: columns[3] || '',
                    date: columns[4] || '',
                    splitType: columns[5] || 'equal',
                    sharathPercent: parseInt(columns[6]) || 50,
                    thejasPercent: parseInt(columns[7]) || 50,
                    category: columns[8] || 'other',
                    timestamp: columns[9] || new Date().toISOString()
                });
            }
        }
        
        return expenses.reverse(); // Most recent first
    }

    // Simple CSV line parser
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current.trim());
        return result;
    }

    // Save expenses to localStorage
    saveToLocalStorage() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    // Save to Google Sheets (we'll provide instructions for manual setup)
    async saveToGoogleSheets() {
        // For now, we'll show instructions to manually update the sheet
        // In a production app, you'd use the Sheets API with proper authentication
        this.showSyncInstructions();
    }

    // Show setup card for first-time users
    showSetupCard() {
        const setupCard = document.getElementById('setup-card');
        const mainContent = document.querySelectorAll('.balance-card, .quick-add-card, .expense-form-card, .summary-card, .expenses-card');
        
        setupCard.style.display = 'block';
        mainContent.forEach(card => card.style.display = 'none');
        
        // Set up the create sheet link
        const createSheetLink = document.getElementById('create-sheet-link');
        createSheetLink.href = this.getGoogleSheetTemplate();
    }

    // Hide setup card and show main content
    hideSetupCard() {
        const setupCard = document.getElementById('setup-card');
        const mainContent = document.querySelectorAll('.balance-card, .quick-add-card, .expense-form-card, .summary-card, .expenses-card');
        
        setupCard.style.display = 'none';
        mainContent.forEach(card => card.style.display = 'block');
    }

    // Get Google Sheet template URL
    getGoogleSheetTemplate() {
        const templateData = [
            ['ID', 'Description', 'Amount', 'Paid By', 'Date', 'Split Type', 'Sharath %', 'Thejas %', 'Category', 'Timestamp'],
            ['1', 'Sample Expense', '100', 'sharath', '2025-10-08', 'equal', '50', '50', 'other', new Date().toISOString()]
        ];
        
        const csvContent = templateData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        const encodedContent = encodeURIComponent(csvContent);
        return `https://docs.google.com/spreadsheets/create?usp=sharing&headers=true&content=${encodedContent}`;
    }

    // Initialize event listeners
    initializeEventListeners() {
        const form = document.getElementById('expense-form');
        const exportBtn = document.getElementById('export-btn');
        const clearBtn = document.getElementById('clear-btn');
        const splitTypeSelect = document.getElementById('split-type');
        const searchInput = document.getElementById('search-expenses');
        const quickButtons = document.querySelectorAll('.quick-btn');
        const datePaid = document.getElementById('date-paid');
        const connectSheetBtn = document.getElementById('connect-sheet');

        // Set today's date as default
        if (datePaid) datePaid.valueAsDate = new Date();

        // Main app event listeners
        if (form) form.addEventListener('submit', (e) => this.handleAddExpense(e));
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportData());
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearAllExpenses());
        if (splitTypeSelect) splitTypeSelect.addEventListener('change', (e) => this.handleSplitTypeChange(e));
        if (searchInput) searchInput.addEventListener('input', (e) => this.handleSearch(e));
        if (connectSheetBtn) connectSheetBtn.addEventListener('click', () => this.connectToSheet());
        
        // Quick add buttons
        quickButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleQuickAdd(e));
        });
        
        // Custom split percentage validation
        const sharathPercent = document.getElementById('sharath-percent');
        const thejasPercent = document.getElementById('thejas-percent');
        
        if (sharathPercent && thejasPercent) {
            sharathPercent.addEventListener('input', () => {
                thejasPercent.value = 100 - parseInt(sharathPercent.value || 0);
            });
            
            thejasPercent.addEventListener('input', () => {
                sharathPercent.value = 100 - parseInt(thejasPercent.value || 0);
            });
        }
    }

    // Connect to Google Sheet
    async connectToSheet() {
        const sheetIdInput = document.getElementById('sheet-id');
        const sheetId = sheetIdInput.value.trim();
        
        if (!sheetId) {
            alert('Please enter a Google Sheet ID');
            return;
        }
        
        // Extract sheet ID from URL if full URL was pasted
        const sheetIdMatch = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        const cleanSheetId = sheetIdMatch ? sheetIdMatch[1] : sheetId;
        
        try {
            // Test if sheet is accessible
            const testUrl = `https://docs.google.com/spreadsheets/d/${cleanSheetId}/export?format=csv&gid=0`;
            const response = await fetch(testUrl);
            
            if (!response.ok) {
                throw new Error('Sheet not accessible');
            }
            
            // Save sheet ID and load data
            this.sheetId = cleanSheetId;
            localStorage.setItem('sheetId', cleanSheetId);
            
            await this.loadFromGoogleSheets();
            this.hideSetupCard();
            this.updateDisplay();
            
            this.showNotification('Successfully connected to Google Sheet!');
            
        } catch (error) {
            alert('Could not connect to Google Sheet. Please make sure:\n1. The sheet is publicly viewable\n2. The ID is correct\n3. You have internet connection');
        }
    }

    // Sync data (reload from Google Sheets)
    async syncData() {
        if (this.sheetId && this.isOnline) {
            try {
                await this.loadFromGoogleSheets();
                this.updateDisplay();
                this.showNotification('Data synced!');
            } catch (error) {
                console.log('Sync failed:', error);
            }
        }
    }

    // Handle adding new expense
    handleAddExpense(e) {
        e.preventDefault();
        
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const paidBy = document.getElementById('paid-by').value;
        const datePaid = document.getElementById('date-paid').value;
        const splitType = document.getElementById('split-type').value;
        
        let sharathPercent = 50;
        let thejasPercent = 50;
        
        // Handle different split types
        if (splitType === '60-40') {
            if (paidBy === 'sharath') {
                sharathPercent = 60; thejasPercent = 40;
            } else {
                sharathPercent = 40; thejasPercent = 60;
            }
        } else if (splitType === '40-60') {
            if (paidBy === 'sharath') {
                sharathPercent = 40; thejasPercent = 60;
            } else {
                sharathPercent = 60; thejasPercent = 40;
            }
        } else if (splitType === '70-30') {
            if (paidBy === 'sharath') {
                sharathPercent = 70; thejasPercent = 30;
            } else {
                sharathPercent = 30; thejasPercent = 70;
            }
        } else if (splitType === '30-70') {
            if (paidBy === 'sharath') {
                sharathPercent = 30; thejasPercent = 70;
            } else {
                sharathPercent = 70; thejasPercent = 30;
            }
        } else if (splitType === 'custom') {
            sharathPercent = parseInt(document.getElementById('sharath-percent').value) || 50;
            thejasPercent = parseInt(document.getElementById('thejas-percent').value) || 50;
            
            if (sharathPercent + thejasPercent !== 100) {
                alert('Percentages must add up to 100%');
                return;
            }
        }

        if (!description || !amount || !paidBy || !datePaid) {
            alert('Please fill in all fields');
            return;
        }

        const expense = {
            id: Date.now().toString(),
            description,
            amount,
            paidBy,
            date: datePaid,
            splitType,
            sharathPercent,
            thejasPercent,
            category: this.getCategoryFromDescription(description),
            timestamp: new Date().toISOString()
        };

        this.expenses.unshift(expense); // Add to beginning of array
        this.saveToLocalStorage();
        this.updateDisplay();
        
        // Show instructions to update Google Sheet
        if (this.sheetId) {
            this.showAddToSheetInstructions(expense);
        }
        
        // Reset form
        e.target.reset();
        document.getElementById('date-paid').valueAsDate = new Date();
        document.getElementById('split-type').value = 'equal';
        this.handleSplitTypeChange({ target: { value: 'equal' } });
        
        // Show success feedback
        this.showNotification('Expense added! Remember to update the Google Sheet.');
    }

    // Show instructions to add expense to Google Sheet
    showAddToSheetInstructions(expense) {
        const instructions = `
To sync with Thejas, add this row to your Google Sheet:

${expense.id},"${expense.description}",${expense.amount},"${expense.paidBy}","${expense.date}","${expense.splitType}",${expense.sharathPercent},${expense.thejasPercent},"${expense.category}","${expense.timestamp}"

Sheet URL: https://docs.google.com/spreadsheets/d/${this.sheetId}/edit
        `;
        
        // Copy to clipboard if possible
        if (navigator.clipboard) {
            const csvRow = `${expense.id},"${expense.description}",${expense.amount},"${expense.paidBy}","${expense.date}","${expense.splitType}",${expense.sharathPercent},${expense.thejasPercent},"${expense.category}","${expense.timestamp}"`;
            navigator.clipboard.writeText(csvRow);
            this.showNotification('Row data copied to clipboard! Paste it in your Google Sheet.');
        } else {
            alert(instructions);
        }
    }

    // Calculate balances
    calculateBalances() {
        let sharathTotal = 0;
        let thejasTotal = 0;
        let sharathPaid = 0;
        let thejasPaid = 0;

        this.expenses.forEach(expense => {
            const amount = expense.amount;
            const sharathPercent = expense.sharathPercent || 50;
            const thejasPercent = expense.thejasPercent || 50;
            
            // Calculate split amounts based on percentages
            const sharathSplit = (amount * sharathPercent) / 100;
            const thejasSplit = (amount * thejasPercent) / 100;

            // Add to total expenses for each person
            sharathTotal += sharathSplit;
            thejasTotal += thejasSplit;

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
            totalExpenses: sharathTotal + thejasTotal,
            sharathTotal,
            thejasTotal
        };
    }

    // Update display
    updateDisplay() {
        this.updateBalanceDisplay();
        this.updateExpensesList();
        this.updateSummaryStats();
    }

    // Update balance display
    updateBalanceDisplay() {
        const balances = this.calculateBalances();
        
        const sharathBalanceEl = document.getElementById('sharath-balance');
        const thejasBalanceEl = document.getElementById('thejas-balance');
        const settlementEl = document.getElementById('settlement');

        if (!sharathBalanceEl || !thejasBalanceEl || !settlementEl) return;

        // Update balance amounts
        sharathBalanceEl.textContent = `₹${Math.abs(balances.sharath).toFixed(2)}`;
        thejasBalanceEl.textContent = `₹${Math.abs(balances.thejas).toFixed(2)}`;

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
            settlementEl.textContent = `Thejas owes Sharath ₹${balances.sharath.toFixed(2)}`;
            settlementEl.className = 'settlement';
        } else {
            settlementEl.textContent = `Sharath owes Thejas ₹${Math.abs(balances.sharath).toFixed(2)}`;
            settlementEl.className = 'settlement';
        }
    }

    // Update expenses list
    updateExpensesList() {
        const expensesList = document.getElementById('expenses-list');
        if (!expensesList) return;
        
        const filteredExpenses = this.getFilteredExpenses();
        
        if (this.expenses.length === 0) {
            expensesList.innerHTML = '<div class="no-expenses">No expenses added yet</div>';
            return;
        }
        
        if (filteredExpenses.length === 0 && this.searchTerm) {
            expensesList.innerHTML = '<div class="no-expenses">No expenses match your search</div>';
            return;
        }

        const expensesHTML = filteredExpenses.map(expense => {
            const splitInfo = this.getSplitInfo(expense);
            const categoryIcon = this.getCategoryIcon(expense.category);
            
            return `
            <div class="expense-item" data-id="${expense.id}">
                <div class="expense-details">
                    <div class="expense-description">
                        <span class="expense-icon">${categoryIcon}</span>
                        ${expense.description}
                        <span class="split-indicator">${splitInfo}</span>
                    </div>
                    <div class="expense-meta">
                        Paid by ${expense.paidBy === 'sharath' ? 'Sharath' : 'Thejas'} • ${this.formatDate(expense.date)}
                    </div>
                </div>
                <div class="expense-amount">₹${expense.amount.toFixed(2)}</div>
                <div class="expense-actions">
                    <button class="btn-small btn-edit" onclick="app.editExpense('${expense.id}')">Edit</button>
                    <button class="btn-small btn-delete" onclick="app.deleteExpense('${expense.id}')">Delete</button>
                </div>
            </div>
        `}).join('');

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

        const newAmount = prompt('Edit amount (₹):', expense.amount);
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
        expense.category = this.getCategoryFromDescription(newDescription);

        this.saveToLocalStorage();
        this.updateDisplay();
        this.showNotification('Expense updated! Remember to update the Google Sheet.');
    }

    // Delete expense
    deleteExpense(id) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveToLocalStorage();
        this.updateDisplay();
        this.showNotification('Expense deleted! Remember to update the Google Sheet.');
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
        this.saveToLocalStorage();
        this.updateDisplay();
        this.showNotification('All expenses cleared!');
    }
    
    // Handle split type change
    handleSplitTypeChange(e) {
        const customSplitDiv = document.getElementById('custom-split');
        if (!customSplitDiv) return;
        
        if (e.target.value === 'custom') {
            customSplitDiv.style.display = 'grid';
            customSplitDiv.classList.add('show');
        } else {
            customSplitDiv.style.display = 'none';
            customSplitDiv.classList.remove('show');
        }
    }
    
    // Handle quick add buttons
    handleQuickAdd(e) {
        const description = e.target.dataset.desc;
        const amount = e.target.dataset.amount;
        
        document.getElementById('description').value = description;
        document.getElementById('amount').value = amount;
        document.getElementById('description').focus();
    }
    
    // Handle search
    handleSearch(e) {
        this.searchTerm = e.target.value.toLowerCase();
        this.updateExpensesList();
    }
    
    // Get filtered expenses based on search
    getFilteredExpenses() {
        if (!this.searchTerm) return this.expenses;
        
        return this.expenses.filter(expense => 
            expense.description.toLowerCase().includes(this.searchTerm) ||
            expense.paidBy.toLowerCase().includes(this.searchTerm) ||
            expense.category.toLowerCase().includes(this.searchTerm)
        );
    }
    
    // Get category from description
    getCategoryFromDescription(description) {
        const desc = description.toLowerCase();
        if (desc.includes('rent')) return 'rent';
        if (desc.includes('electric') || desc.includes('power')) return 'electricity';
        if (desc.includes('wifi') || desc.includes('internet')) return 'wifi';
        if (desc.includes('water')) return 'water';
        if (desc.includes('cook') || desc.includes('maid')) return 'cook';
        if (desc.includes('grocer') || desc.includes('food') || desc.includes('meal')) return 'groceries';
        if (desc.includes('transport') || desc.includes('uber') || desc.includes('auto')) return 'transport';
        if (desc.includes('medical') || desc.includes('doctor') || desc.includes('medicine')) return 'medical';
        return 'other';
    }
    
    // Get category icon
    getCategoryIcon(category) {
        const icons = {
            rent: '🏠',
            electricity: '⚡',
            wifi: '🌐',
            water: '💧',
            cook: '🍳',
            groceries: '🛒',
            transport: '🚗',
            medical: '🏥',
            other: '💰'
        };
        return icons[category] || icons.other;
    }
    
    // Get split information
    getSplitInfo(expense) {
        if (expense.sharathPercent === 50 && expense.thejasPercent === 50) {
            return '50/50';
        }
        return `${expense.sharathPercent || 50}/${expense.thejasPercent || 50}`;
    }
    
    // Update summary statistics
    updateSummaryStats() {
        const balances = this.calculateBalances();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Filter expenses for current month
        const monthExpenses = this.expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate.getMonth() === currentMonth && 
                   expenseDate.getFullYear() === currentYear;
        });
        
        const monthTotal = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const daysInMonth = new Date().getDate();
        const dailyAvg = monthTotal / daysInMonth;
        
        const totalEl = document.getElementById('total-expenses');
        const monthEl = document.getElementById('month-expenses');
        const dailyEl = document.getElementById('daily-avg');
        
        if (totalEl) totalEl.textContent = `₹${balances.totalExpenses.toFixed(2)}`;
        if (monthEl) monthEl.textContent = `₹${monthTotal.toFixed(2)}`;
        if (dailyEl) dailyEl.textContent = `₹${dailyAvg.toFixed(2)}`;
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
            max-width: 300px;
        `;

        document.body.appendChild(notification);

        // Remove after 5 seconds (longer for instructions)
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
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