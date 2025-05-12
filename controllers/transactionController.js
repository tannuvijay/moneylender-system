const Transaction = require('../models/Transaction');
const Log = require('../models/logs');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const calog=require('../models/calog');
exports.exportITRToExcel = async (req, res) => {
  const filter={};
  const logs = await req.calog.find(filter);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('calogs');

  worksheet.columns = [
    { header: 'Customer Name', key: 'customerName', width: 20 },
    { header: 'Jewel Type', key: 'jewelType', width: 10 },
    { header: 'Jewel Name', key: 'jewelName', width: 10 },
    { header: 'Weight', key: 'weight', width: 10 },
    { header: 'tanch', key: 'tanch', width: 10 },
    { header: 'Amount', key: 'amountGiven', width: 10 },
    { header: 'Interest rate', key: 'interestRateUsed', width: 10 },
    { header: 'Interest Amount', key: 'interestAmount', width: 10 },
    { header: 'Original Date', key: 'originalDate', width: 20 },
    { header: 'Archieved Date', key: 'archivedAt', width: 20 },
  ];

  logs.forEach(t => worksheet.addRow(t));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};
exports.exportITRToPDF = async (req, res) => {
  try {
    const { customerName, sirname, month, year } = req.query;
    const filter = {};

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    if (sirname) {
      filter.Sirname = { $regex: sirname, $options: 'i' };
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    }

    const logs = await req.calog.find(filter);
    if (!logs.length) return res.status(404).send('No logs found for the given filters.');

    // Landscape PDF
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Disposition', 'attachment; filename=logs.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Archived Logs Report', { align: 'center' }).moveDown(1);

    const headers = [
      'Customer', 'Jewel', 'Type', '₹Amt', 'Wt(g)', 'Tanch%', 
      'Rate%', '₹Int', 'Orig.Date', 'Archived'
    ];

    const columnWidths = [90, 90, 70, 70, 50, 50, 50, 70, 80, 90];  // Adjusted widths for more compact columns
    const startX = 20;
    let y = doc.y;

    // Draw headers
    let x = startX;
    doc.font('Helvetica-Bold').fontSize(8);
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: columnWidths[i], align: 'left' });
      x += columnWidths[i];
    });
    y += 12;
    doc.moveTo(startX, y).lineTo(820, y).stroke(); // Adjust line width for landscape mode

    // Draw rows
    doc.font('Helvetica').fontSize(7);
    logs.forEach(log => {
      let x = startX;
      y += 4;
      if (y > 560) {
        doc.addPage({ layout: 'landscape' });
        y = 20;

        // Redraw headers on new page
        x = startX;
        doc.font('Helvetica-Bold').fontSize(8);
        headers.forEach((header, i) => {
          doc.text(header, x, y, { width: columnWidths[i], align: 'left' });
          x += columnWidths[i];
        });
        y += 12;
        doc.moveTo(startX, y).lineTo(820, y).stroke();
        doc.font('Helvetica').fontSize(7);
        y += 2;
      }

      const rowData = [
        log.customerName,
        log.jewelName,
        log.jewelType,
        `₹${log.amountGiven}`,
        log.weight,
        log.tanch,
        log.interestRateUsed,
        `₹${log.interestAmount}`,
        new Date(log.originalDate).toLocaleDateString(),
        new Date(log.archivedAt).toLocaleDateString()
      ];

      x = startX;
      rowData.forEach((text, i) => {
        doc.text(String(text), x, y, { width: columnWidths[i], align: 'left' });
        x += columnWidths[i];
      });

      y += 10;
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating PDF');
  }
};


exports.lendMoney = async (req, res) => {
  const {
    customerName, jewelType, amountGiven, date,
    jewelName, father, village, sirname, contact,weight,tanch,
  } = req.body;
  await req.Transaction.create({
    ownerId: req.session.ownerId,
    customerName,
    jewelType,
    amountGiven,
    jewelName,
    father,
    village,
    sirname,
    contact,
    weight,
    tanch,
    date: new Date(date)
  });

  res.redirect('/dashboard');
};
exports.releaseItem = async (req, res) => {
  await Transaction.findByIdAndUpdate(req.params.id, {
    isFreed: true,
    freedDate: new Date()
  });
  res.redirect('/transactions');
};
exports.exportToExcel = async (req, res) => {
  const transactions = await req.Transaction.find({ ownerId: req.session.ownerId });

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Transactions');

  worksheet.columns = [
    { header: 'Customer Name', key: 'customerName', width: 20 },
    { header: 'Surnam', key: 'sirname', width: 20 },
    { header: 'Jewel Type', key: 'jewelType', width: 10 },
    { header: 'Jewel Name', key: 'jewelName', width: 10 },
    { header: 'Weight', key: 'weight', width: 10 },
    { header: 'tanch', key: 'tanch', width: 10 },
    { header: 'Amount', key: 'amountGiven', width: 10 },
    { header: 'Date', key: 'date', width: 20 },
  ];

  transactions.forEach(t => worksheet.addRow(t));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};
exports.exportLogsToExcel = async (req, res) => {
  const filter={};
  const logs = await req.Log.find(filter);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Log');

  worksheet.columns = [
    { header: 'Customer Name', key: 'customerName', width: 20 },
    { header: 'Surnam', key: 'sirname', width: 20 },
    { header: 'Jewel Type', key: 'jewelType', width: 10 },
    { header: 'Jewel Name', key: 'jewelName', width: 10 },
    { header: 'Weight', key: 'weight', width: 10 },
    { header: 'tanch', key: 'tanch', width: 10 },
    { header: 'Amount', key: 'amountGiven', width: 10 },
    { header: 'Interest rate', key: 'interestRateUsed', width: 10 },
    { header: 'Interest Amount', key: 'interestAmount', width: 10 },
    { header: 'Original Date', key: 'originalDate', width: 20 },
    { header: 'Archieved Date', key: 'archivedAt', width: 20 },
  ];

  logs.forEach(t => worksheet.addRow(t));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=transactions.xlsx');

  await workbook.xlsx.write(res);
  res.end();
};
exports.exportLogsToPDF = async (req, res) => {
  try {
    const { customerName, sirname, month, year } = req.query;
    const filter = {};

    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    if (sirname) {
      filter.Sirname = { $regex: sirname, $options: 'i' };
    }

    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    }

    const logs = await req.Log.find(filter);
    if (!logs.length) return res.status(404).send('No logs found for the given filters.');

    // Landscape PDF
    const doc = new PDFDocument({ margin: 20, size: 'A4', layout: 'landscape' });

    res.setHeader('Content-Disposition', 'attachment; filename=logs.pdf');
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Archived Logs Report', { align: 'center' }).moveDown(1);

    const headers = [
      'Customer', 'Surname', 'Jewel', 'Type', '₹Amt', 'Wt(g)', 'Tanch%', 
      'Rate%', '₹Int', 'Orig.Date', 'Archived'
    ];

    const columnWidths = [90, 90, 70, 70, 70, 50, 50, 50, 70, 80, 90];  // Adjusted widths for more compact columns
    const startX = 20;
    let y = doc.y;

    // Draw headers
    let x = startX;
    doc.font('Helvetica-Bold').fontSize(8);
    headers.forEach((header, i) => {
      doc.text(header, x, y, { width: columnWidths[i], align: 'left' });
      x += columnWidths[i];
    });
    y += 12;
    doc.moveTo(startX, y).lineTo(820, y).stroke(); // Adjust line width for landscape mode

    // Draw rows
    doc.font('Helvetica').fontSize(7);
    logs.forEach(log => {
      let x = startX;
      y += 4;
      if (y > 560) {
        doc.addPage({ layout: 'landscape' });
        y = 20;

        // Redraw headers on new page
        x = startX;
        doc.font('Helvetica-Bold').fontSize(8);
        headers.forEach((header, i) => {
          doc.text(header, x, y, { width: columnWidths[i], align: 'left' });
          x += columnWidths[i];
        });
        y += 12;
        doc.moveTo(startX, y).lineTo(820, y).stroke();
        doc.font('Helvetica').fontSize(7);
        y += 2;
      }

      const rowData = [
        log.customerName,
        log.Sirname,
        log.jewelName,
        log.jewelType,
        `₹${log.amountGiven}`,
        log.weight,
        log.tanch,
        log.interestRateUsed,
        `₹${log.interestAmount}`,
        new Date(log.originalDate).toLocaleDateString(),
        new Date(log.archivedAt).toLocaleDateString()
      ];

      x = startX;
      rowData.forEach((text, i) => {
        doc.text(String(text), x, y, { width: columnWidths[i], align: 'left' });
        x += columnWidths[i];
      });

      y += 10;
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating PDF');
  }
};
exports.exportToPDF = async (req, res) => {
  const transactions = await req.Transaction.find({ ownerId: req.session.ownerId });

  const doc = new PDFDocument({ 
    margin: 30, 
    size: 'A4',  // Default A4 size is portrait
    layout: 'portrait' // Ensure the layout is portrait (this is the default, so it can be omitted if it's just for clarity)
  });

  res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).text('Transaction Report', { align: 'center' });
  doc.moveDown();

  // Updated headers after removing Father, Village, and Contact
  const headers = [
    'Customer', 'Surname', 'Jewel Type', 'Jewel Name', 'Weight(gm)', 'Tanch(%)',
    'Amount (₹)', 'Date'
  ];

  // Updated column widths after removing Father, Village, and Contact columns
  const colWidths = [80, 80, 60, 60, 50, 50, 60, 60];
  const startX = 30;
  let y = doc.y;

  // Draw headers
  headers.forEach((text, i) => {
    doc.font('Helvetica-Bold').fontSize(7).text(text, startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, { width: colWidths[i], align: 'center' });
  });

  y += 15; // Space between header and rows

  // Draw rows
  transactions.forEach(t => {
    const row = [
      t.customerName,
      t.sirname,
      t.jewelType,
      t.jewelName,
      t.weight,
      t.tanch,
      `₹${t.amountGiven}`,
      t.date ? new Date(t.date).toLocaleDateString() : 'N/A',
    ];

    // Check if new page is needed
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 30;
    }

    row.forEach((text, i) => {
      doc.font('Helvetica').fontSize(7).text(String(text), startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0), y, {
        width: colWidths[i],
        align: 'center'
      });
    });

    y += 15; // Space between rows
  });

  doc.end();
};
exports.showInterestForm = async (req, res) => {
  try {
    let transactions = [];
    const { name, village, surname } = req.query;

    // Start with the base filter
    let filter = { ownerId: req.session.ownerId };

    // Flag to check if at least one search term is provided
    let isSearchPerformed = false;

    // Handle the customer name search
    if (name) {
      filter.customerName = { $regex: `^${name}$`, $options: 'i' };
      isSearchPerformed = true;
    }

    // Handle village search
    if (village) {
      filter.village = { $regex: `^${village}`, $options: 'i' };
      isSearchPerformed = true;
    }

    // Handle surname search
    if (surname) {
      filter.sirname = { $regex: `^${surname}`, $options: 'i' };
      isSearchPerformed = true;
    }

    // If no search term is provided, return a message and avoid querying the database
    if (!isSearchPerformed) {
      return res.render('calculate-interest', {
        message: "Please enter a search term to proceed.",
      });
    }

    // Query the database using the filter
    transactions = await req.Transaction.find(filter);

    // Render the result page with the filtered transactions
    res.render('calculate-interest', { transactions });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
exports.calculateInterest = async (req, res) => {
  try {
    const { transactionId, interestRate } = req.body;
    const transaction = await req.Transaction.findById(transactionId);

    if (!transaction) {
      return res.status(404).send('Transaction not found');
    }

    const customInterestRate = parseFloat(interestRate);
    if (isNaN(customInterestRate) || customInterestRate <= 0) {
      return res.status(400).send('Invalid interest rate');
    }

    const now = new Date();
    const startDate = new Date(transaction.date);

    // Calculate total time difference in milliseconds
    const msDiff = now - startDate;
    const totalDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // Calculate total months (including fractional part)
    const timeInMonths = totalDays / 30; // Approximate average month length

    // Format time display
    let timeDisplay = '';
    if (timeInMonths < 1) {
      // Less than one month, show days and charge for 1 full month
      timeDisplay = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
    } else {
      const fullMonths = Math.floor(timeInMonths);
      const remainingDays = Math.round(totalDays - fullMonths * 30);

      timeDisplay = `${fullMonths} month${fullMonths !== 1 ? 's' : ''}`;
      if (remainingDays > 0) {
        timeDisplay += ` and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
      }
    }

    // Ensure minimum 1 month is charged
    const interestMonthsCharged = Math.max(timeInMonths, 1);
    let interest = (transaction.amountGiven * customInterestRate * interestMonthsCharged) / 100;


    //for amount1
    let timeDisplay1 = '';
    if(transaction.amount1!=0){
      const now = new Date();
      const startDate = new Date(transaction.date1);
  
      // Calculate total time difference in milliseconds
      const msDiff = now - startDate;
      const totalDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  
      // Calculate total months (including fractional part)
      const timeInMonths = totalDays / 30; // Approximate average month length
  
      // Format time display
      
      if (timeInMonths < 1) {
        // Less than one month, show days and charge for 1 full month
        timeDisplay1 = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
      } else {
        const fullMonths = Math.floor(timeInMonths);
        const remainingDays = Math.round(totalDays - fullMonths * 30);
  
        timeDisplay1 = `${fullMonths} month${fullMonths !== 1 ? 's' : ''}`;
        if (remainingDays > 0) {
          timeDisplay1 += ` and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        }
      }
  
      // Ensure minimum 1 month is charged
      const interestMonthsCharged = Math.max(timeInMonths, 1);
      const interest1 = (transaction.amount1 * customInterestRate * interestMonthsCharged) / 100;
      interest+=interest1;
    }
    let timeDisplay2 = '';
    if(transaction.amount2!=0){
      const now = new Date();
      const startDate = new Date(transaction.date2);
  
      // Calculate total time difference in milliseconds
      const msDiff = now - startDate;
      const totalDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  
      // Calculate total months (including fractional part)
      const timeInMonths = totalDays / 30; // Approximate average month length
  
      // Format time display
      if (timeInMonths < 1) {
        // Less than one month, show days and charge for 1 full month
        timeDisplay2 = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
      } else {
        const fullMonths = Math.floor(timeInMonths);
        const remainingDays = Math.round(totalDays - fullMonths * 30);
  
        timeDisplay2 = `${fullMonths} month${fullMonths !== 1 ? 's' : ''}`;
        if (remainingDays > 0) {
          timeDisplay2 += ` and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        }
      }
  
      // Ensure minimum 1 month is charged
      const interestMonthsCharged = Math.max(timeInMonths, 1);
      const interest2 = (transaction.amount2 * customInterestRate * interestMonthsCharged) / 100;
      interest+=interest2;
    }
    let timeDisplay3='';
    if(transaction.amount3!=0){
      const now = new Date();
      const startDate = new Date(transaction.date3);
  
      // Calculate total time difference in milliseconds
      const msDiff = now - startDate;
      const totalDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));
  
      // Calculate total months (including fractional part)
      const timeInMonths = totalDays / 30; // Approximate average month length
  
      // Format time display
      if (timeInMonths < 1) {
        // Less than one month, show days and charge for 1 full month
        timeDisplay3 = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
      } else {
        const fullMonths = Math.floor(timeInMonths);
        const remainingDays = Math.round(totalDays - fullMonths * 30);
  
        timeDisplay3 = `${fullMonths} month${fullMonths !== 1 ? 's' : ''}`;
        if (remainingDays > 0) {
          timeDisplay3 += ` and ${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        }
      }
  
      // Ensure minimum 1 month is charged
      const interestMonthsCharged = Math.max(timeInMonths, 1);
      const interest3 = (transaction.amount3 * customInterestRate * interestMonthsCharged) / 100;
      interest+=interest3;
    }
    // Render the result page
    const principle=transaction.amountGiven+transaction.amount1+transaction.amount2+transaction.amount3;
    const grand=principle+interest;
    res.render('interest-result', {
      customerName: transaction.customerName,
      amountGiven: transaction.amountGiven,
      interestRate: customInterestRate,
      interest: (interest+transaction.remaininterest).toFixed(2),
      timeDisplay: timeDisplay,
      amount1:transaction.amount1,
      amount2:transaction.amount2,
      amount3:transaction.amount3,
      timeDisplay1: timeDisplay1,
      timeDisplay2: timeDisplay2,
      timeDisplay3: timeDisplay3,
      transactionId: transaction._id,
      principle:principle.toFixed(2),
      grandTotal:grand.toFixed(2),
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};
exports.deleteEntry = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const logInterestRate = parseFloat(req.body.logInterestRate);

    if (isNaN(logInterestRate) || logInterestRate <= 0) {
      return res.status(400).send('Invalid interest rate');
    }

    const transaction = await req.Transaction.findById(transactionId);
    if (!transaction || !transaction.date) {
      return res.status(404).send('Transaction not found or invalid date');
    }

    const now = new Date();
    const startDate = new Date(transaction.date);

    // Calculate the time in days
    const msDiff = now - startDate;
    const totalDays = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // Calculate time in months (approximate)
    let timeInMonths = totalDays / 30;

    // Ensure minimum 1 month is charged
    const interestMonthsCharged = Math.max(timeInMonths, 1);

    // Calculate interest
    const interest = (transaction.amountGiven * logInterestRate * interestMonthsCharged) / 100;

    // Create log entry
    await req.Log.create({
      customerName: transaction.customerName,
      FatherName: transaction.father,
      Sirname: transaction.sirname,
      Village: transaction.village,
      jewelType: transaction.jewelType,
      jewelName: transaction.jewelName,
      amountGiven: transaction.amountGiven,    
      weight: transaction.weight,
      tanch:transaction.tanch,
      originalDate: transaction.date,
      contactNumber: transaction.contact,
      interestRateUsed: logInterestRate,
      interestAmount: interest.toFixed(2),
    });

    // Delete transaction
    await req.Transaction.findByIdAndDelete(transactionId);

    res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error while deleting and archiving');
  }
};
exports.showLogs = async (req, res) => {
  try {
    const { customerName, sirname, month, year } = req.query;
    const filter = {};

    // Filter by customer name (case-insensitive)
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    // Filter by sirname (case-insensitive)
    if (sirname) {
      filter.Sirname = { $regex: sirname, $options: 'i' };
    }

    // Filter by month and year from originalDate
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    }

    const logs = await req.Log.find(filter).sort({ archivedAt: -1 });

    res.render('logs', { logs });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load logs');
  }
};
exports.showActive = async (req, res) => {
  try {
    const { customerName, sirname, month, year } = req.query;
    const filter = {};

    // Filter by customer name (case-insensitive)
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    // Filter by sirname (case-insensitive)
    if (sirname) {
      filter.Sirname = { $regex: sirname, $options: 'i' };
    }

    // Filter by month and year from originalDate
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    } else if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      filter.originalDate = { $gte: startDate, $lte: endDate };
    }

    const logs = await req.Transaction.find(filter).sort({ archivedAt: -1 });
    console.log(logs);
    res.render('currTransaction', { logs });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load logs');
  }
};
exports.searchLendTransaction = async (req, res) => {
  const { customerName, jewelName,date } = req.body;

  const transaction = await req.Transaction.findOne({
    customerName,
    date: new Date(date),
    jewelName,
  });

  res.render('lend-form', { transaction });
};
exports.updateLend = async (req, res) => {
  const { amount, date } = req.body;
  const txn = await req.Transaction.findById(req.params.id);
  if (!txn) return res.send("Transaction not found.");

  const dateObj = new Date(date);
  if (!txn.amount1) {
    txn.amount1 = amount;
    txn.date1 = dateObj;
  }
  else if (!txn.amount2) {
    txn.amount2 = amount;
    txn.date2 = dateObj;
  } else if (!txn.amount3) {
    txn.amount3 = amount;
    txn.date3 = dateObj;
  } else {
    return res.send("All 3 lend entries are filled.");
  }

  await txn.save();
  res.redirect('/lend-form');
};



exports.updateInterestPayment = async (req, res) => {
  try {
    const transactionId = req.params.id;
    const { amountPaid, totalInterest, totalAmounts,date } = req.body;

    const paid = parseFloat(amountPaid);
    const interest = parseFloat(totalInterest);
    const amountsTotal = parseFloat(totalAmounts);

    const txn = await req.Transaction.findById(transactionId);
    if (!txn) return res.status(404).send('Transaction not found');

    let remaininterest = 0;
    let newAmountGiven = txn.amountGiven;

    if (paid >= interest) {
      remaininterest = 0;
      const excess = paid - interest;
      newAmountGiven = amountsTotal - excess;
    } else {
      remaininterest = interest - paid;
      newAmountGiven = amountsTotal;
    }

    // Update the transaction
    txn.amountGiven = Math.max(0, newAmountGiven);
    txn.remaininterest = remaininterest;
    txn.amount1 = 0;
    txn.amount2 = 0;
    txn.amount3 = 0;
    txn.date1 = null;
    txn.date2 = null;
    txn.date3 = null;
    txn.date = new Date(date); // Reset main transaction date to now

    await txn.save();
    res.redirect('/dashboard'); // Or wherever you want to redirect
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating transaction interest');
  }
};
