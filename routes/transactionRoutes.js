const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const tenantMiddleware = require('../middlewares/tenantMiddleware');
const Log = require('../models/logs');
const calog = require("../models/calog");  // The new model

// Middleware to ensure the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.ownerId) next();
  else res.redirect('/login');
}

router.use(isAuthenticated);

// Tenant middleware to assign tenant db and models
router.use(tenantMiddleware);

router.get('/dashboard', (_, res) => res.render('dashboard'));
router.get('/lend-form', (req, res) => res.render('lend-form', { transaction: null }));
router.post('/lend', transactionController.lendMoney);
router.post('/release/:id', transactionController.releaseItem);
router.get('/export/excel', transactionController.exportToExcel);
router.get('/export/pdf', transactionController.exportToPDF);
router.get('/calculate-interest', transactionController.showInterestForm);
router.post('/calculate-interest', transactionController.calculateInterest);
router.post('/delete-entry/:id', transactionController.deleteEntry);
router.get('/logs', transactionController.showLogs);
router.get('/active', transactionController.showActive);
router.get('/export/logs/pdf', transactionController.exportLogsToPDF);
router.get('/export/logs/excel', transactionController.exportLogsToExcel);

router.get('/export/ITR/pdf', transactionController.exportITRToPDF);
router.get('/export/ITR/excel', transactionController.exportITRToExcel);
const Transaction = require('../models/Transaction');
const Owner = require('../models/Owner');
router.get('/check-credits', async (req, res) => res.render('creditForm'));
router.post('/check-credits', async (req, res) => {
  const { goldRate, silverRate, interestRate } = req.body;
  const ownerId = req.session.ownerId;
  if (!ownerId) return res.redirect('/login');

  const transactions = await req.Transaction.find({ ownerId });

  const results = [];

  transactions.forEach(txn => {
    const rate = txn.jewelType === 'gold' ? goldRate : silverRate;
    const creditValue = txn.weight * txn.tanch * rate/100;
    const now = new Date();
    const startDate = new Date(txn.date);
    console.log("startDate",startDate);
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
    const TotalAmount=txn.amountGiven+txn.amount1+txn.amount2+txn.amount3;
    const interestMonthsCharged = Math.max(timeInMonths, 1);
    console.log("interestMonthsCharged",interestMonthsCharged);
    console.log("interestRate",interestRate)
    const interest = (TotalAmount * interestRate * interestMonthsCharged) / 100;
    console.log("5",interest);
    const totalCredit = txn.amountGiven + interest;
    console.log("1",totalCredit);
    console.log("2",creditValue);
    if (totalCredit >= creditValue) {
      const message = `प्रिय ग्राहक आपके द्वारा गिरवी रखी गई वस्तु के मूल्य से हमारे द्वारा उधर दी गई राशि एवं ब्याज अधिक हो रहा है अतः शीघ्र ही अपना ब्याज एवं राशि जमा कारण अन्यथा एक माह के भीतर आपकी रखी हुई वस्तु वास्तु भेज दी जाएगी दी जाएगी `;
      const whatsappLink = `https://wa.me/91${txn.contact}?text=${encodeURIComponent(message)}`;
      results.push({ name: txn.customerName, link: whatsappLink });
    }
  });

  res.render('creditResult', { results });
});
router.post('/lend-search', transactionController.searchLendTransaction);
router.post('/lend-update/:id', transactionController.updateLend);
router.post('/update-transaction/:id', transactionController.updateInterestPayment);



router.get("/ca", async (req, res) => {
    try {
        // Fetch logs from the database
        const logs = await req.calog.find().sort({ archivedAt: -1 }); // Adjust the query as needed

        // Render the caschema view and pass the logs
        res.render("caschema", { logs });
    } catch (err) {
        console.error("Failed to load logs for CA schema:", err);
        res.status(500).send("Failed to load logs for CA schema");
    }
});


// Handle sending data to CA (Ensure client uses POST for this)
router.post("/send-to-ca", async (req, res) => {
    try {
        const logId = req.body.logId;
        if (!logId) {
            return res.status(400).send("logId is required");
        }

        // Find the log to copy data from
        const transaction = await req.Log.findById(logId);
        if (!transaction) {
            return res.status(404).send("Log not found");
        }

        // Create a new entry in calog collection
        await req.calog.create({
            customerName: transaction.customerName,
            FatherName: transaction.FatherName,  // Note: Original code had 'father' field here
            Sirname: transaction.Sirname,
            Village: transaction.Village,
            jewelType: transaction.jewelType,
            jewelName: transaction.jewelName,
            amountGiven: transaction.amountGiven,
            weight: transaction.weight,
            tanch: transaction.tanch,
            originalDate: transaction.originalDate,
            contactNumber: transaction.contact,
            interestRateUsed: transaction.interestRateUsed,
            archivedAt: transaction.archivedAt,
            interestAmount: transaction.interestAmount ? transaction.interestAmount.toFixed(2) : 0,
            // archivedAt will be set automatically by schema default
        });
        console.log(transaction.originalDate);
        res.redirect("/logs");
    } catch (err) {
        console.error("Failed to send log to CA:", err);
        res.status(500).send("Failed to send log to CA");
    }
});

// Handle fetching logs with filtering via GET
router.get("/send-to-ca", async (req, res) => {
  try {
    const { customerName, sirname, month, year, date } = req.query;
    const filter = {};

    // Case-insensitive partial match for customerName
    if (customerName) {
      filter.customerName = { $regex: customerName, $options: 'i' };
    }

    // Case-insensitive partial match for sirname
    if (sirname) {
      filter.sirname = { $regex: sirname, $options: 'i' };
    }

    // Filter by exact date
    if (date) {
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      filter.archivedAt = { $gte: dayStart, $lte: dayEnd };
    } else if (month && year) {
      // Filter by month + year
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);
      filter.archivedAt = { $gte: startDate, $lte: endDate };
    } else if (year) {
      // Filter by year only
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      filter.archivedAt = { $gte: startDate, $lte: endDate };
    }

    const logs = await req.calog.find(filter).sort({ archivedAt: -1 });

    // Initialize interest variables
    let dailyInterest = 0;
    let monthlyInterest = 0;
    let yearlyInterest = 0;

    // For date, month, and year filtering
    const targetDate = date ? new Date(date) : null;
    const targetMonth = month ? parseInt(month) : null;
    const targetYear = year ? parseInt(year) : null;

    logs.forEach(log => {
      const logDate = new Date(log.archivedAt);
      logDate.setHours(0, 0, 0, 0); // Strip time part
      const interest = parseFloat(log.interestAmount || 0);
      if (targetDate) {
        targetDate.setHours(0, 0, 0, 0); // normalize it!
      }

      // Calculate daily interest
      if (targetDate && logDate.getTime() === targetDate.getTime()) {
        dailyInterest += interest;
      }

      // Calculate monthly interest
      if (
        targetMonth &&
        targetYear &&
        logDate.getMonth() + 1 === targetMonth &&
        logDate.getFullYear() === targetYear
      ) {
        monthlyInterest += interest;
      }

      // Calculate yearly interest
      if (targetYear && logDate.getFullYear() === targetYear) {
        yearlyInterest += interest;
      }
    });

    // Send filtered data with interest summary to the view
    console.log(logs);
    console.log("! ",dailyInterest);
    console.log("@ ",monthlyInterest);
    console.log("# ",yearlyInterest);
    console.log("$ ",date);
    console.log("% ",month);
    console.log("& ",year);
    res.render("caschema", {
      logs,
      dailyInterest,
      monthlyInterest,
      yearlyInterest,
      date: date || null,
      month: month || null,
      year: year || null
    });
  } catch (err) {
    console.error("Failed to load logs:", err);
    res.status(500).send("Failed to load logs");
  }
});



module.exports = router;
