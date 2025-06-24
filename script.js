// =================================================================
//     SKRIP UTAMA UNTUK APLIKASI LAPORAN HEWAN (dengan Debug Log - Limit 20 Data)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
  // URL Google Apps Script untuk operasi GET dan POST
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbygbBrVEePj8Y4MW1CfGbuDwOmxDsQsQ1al6jyx3yAwRoeyDdkNGzqz5pqZzJa3awlwYg/exec';
  // ID Spreadsheet Google untuk fitur download Excel dan tombol "Go to Spreadsheet"
  const SPREADSHEET_ID = '13ZuBdQHtqp6nHLFOIjgMcoKvvRKRwFndWE54B1d40kc';

  // Validasi URL dan Spreadsheet ID
  if (!SCRIPT_URL || !SCRIPT_URL.startsWith('https://')) {
    console.error('SCRIPT_URL tidak valid:', SCRIPT_URL);
    throw new Error('URL Google Apps Script tidak valid');
  }

  if (!SPREADSHEET_ID || SPREADSHEET_ID.length < 10) {
    console.error('SPREADSHEET_ID tidak valid:', SPREADSHEET_ID);
    throw new Error('ID Spreadsheet tidak valid');
  }

  // DOM Elements
  const form = document.getElementById('laporanForm');
  const statusMessage = document.getElementById('statusMessage');
  const stagingStatusMessage = document.getElementById('stagingStatusMessage');
  const downloadExcelButton = document.getElementById('downloadExcel');
  const stagingTableContainer = document.getElementById('stagingTableContainer');
  const namaHewanInput = document.getElementById('namaHewan');
  const zonaInput = document.getElementById('zona');
  const jumlahInput = document.getElementById('jumlah');
  const submitStagedDataButton = document.getElementById('submitStagedDataButton');
  const saveToQuickSelectBtn = document.getElementById('saveToQuickSelectBtn');
  const quickAnimalsGrid = document.getElementById('quickAnimalsGrid');
  const quickAnimalsMessage = document.getElementById('quickAnimalsMessage');
  // New DOM elements for weather feature
  const weatherHujanBtn = document.getElementById('weatherHujanBtn');
  const weatherKeringBtn = document.getElementById('weatherKeringBtn');
  const weatherStatusMessage = document.getElementById('weatherStatusMessage');
  // Existing elements for global data display
  const tabelDataContainer = document.getElementById('tabelData');
  const searchInput = document.getElementById('searchInput');
  // New DOM element for "Go to Spreadsheet" button
  const goToSpreadsheetBtn = document.getElementById('goToSpreadsheetBtn');

  // Variables
  let stagedReports = [];
  let quickAnimalsList = [];
  const LOCAL_STORAGE_KEY = 'animalReportsStaging';
  const QUICK_ANIMALS_STORAGE_KEY = 'quickAnimalsList';
  let currentAnimalClickCount = 0;
  let lastClickedAnimal = '';

  // Global data variable for filtering
  let rawGlobalData = []; // To store all fetched data for filtering

  /**
   * Menampilkan pesan status dengan gaya yang sesuai
   * @param {string} message - Pesan yang akan ditampilkan.
   * @param {'info' | 'success' | 'error'} type - Tipe pesan (info, success, error).
   * @param {HTMLElement} targetElement - Elemen DOM tempat pesan akan ditampilkan.
   */
  function showStatusMessage(message, type, targetElement) {
    targetElement.textContent = message;
    targetElement.className = `mt-4 text-center font-medium text-sm min-h-[20px] rounded-lg p-3`;

    if (type === 'info') {
      targetElement.classList.add('text-primary-indigo', 'bg-light-indigo', 'border', 'border-blue-200');
    } else if (type === 'success') {
      targetElement.classList.add('text-success-green', 'bg-emerald-50', 'border', 'border-emerald-200');
    } else if (type === 'error') {
      targetElement.classList.add('text-error-red', 'bg-red-50', 'border', 'border-red-200');
    }
    // Hapus pesan setelah beberapa detik
    setTimeout(() => {
      targetElement.textContent = '';
      targetElement.className = 'mt-4 text-center font-medium text-sm min-h-[20px]';
    }, 3000);
  }

  /**
   * Menyimpan laporan sementara ke localStorage
   */
  function saveStagedReports() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(stagedReports));
  }

  /**
   * Memuat laporan sementara dari localStorage
   */
  function loadStagedReports() {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (storedData) {
      try {
        stagedReports = JSON.parse(storedData);
        // Ensure 'weather' property exists for old data
        stagedReports = stagedReports.map((report) => ({ ...report, weather: report.weather || '' }));
        renderStagingTable();
      } catch (e) {
        console.error('Gagal mengurai laporan sementara dari localStorage:', e);
        stagedReports = [];
      }
    }
  }

  /**
   * Menyimpan daftar hewan cepat ke localStorage
   */
  function saveQuickAnimalsList() {
    localStorage.setItem(QUICK_ANIMALS_STORAGE_KEY, JSON.stringify(quickAnimalsList));
  }

  /**
   * Memuat daftar hewan cepat dari localStorage
   */
  function loadQuickAnimalsList() {
    const storedData = localStorage.getItem(QUICK_ANIMALS_STORAGE_KEY);
    if (storedData) {
      try {
        quickAnimalsList = JSON.parse(storedData);
      } catch (e) {
        console.error('Gagal mengurai daftar hewan cepat dari localStorage:', e);
        quickAnimalsList = [];
      }
    } else {
      // Inisialisasi dengan hewan default jika tidak ada data
      quickAnimalsList = ['Burung Pipit', 'Burung Gagak', 'Burung Layang-layang', 'Burung Elang', 'Kucing', 'Anjing', 'Tikus', 'Kelinci', 'Ular', 'Kadal', 'Kelelawar', 'Monyet'];
      saveQuickAnimalsList();
    }
    renderQuickAnimals();
  }

  /**
   * Merender tombol hewan cepat
   */
  function renderQuickAnimals() {
    quickAnimalsGrid.innerHTML = ''; // Hapus kontainer terlebih dahulu

    if (quickAnimalsList.length === 0) {
      quickAnimalsMessage.classList.remove('hidden');
      return;
    }

    quickAnimalsMessage.classList.add('hidden');

    // Buat tombol untuk setiap hewan
    quickAnimalsList.forEach((animalName) => {
      const button = document.createElement('button');
      button.className = 'hewan-btn relative';
      button.setAttribute('data-animal', animalName);

      button.innerHTML = `
                <span class="animal-name">${animalName}</span>
                <button class="delete-icon" data-animal="${animalName}" title="Hapus ${animalName}">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;

      // Tambahkan event klik untuk tombol utama (untuk memilih hewan)
      button.addEventListener('click', (e) => {
        // Mencegah event jika ikon hapus diklik
        if (e.target.closest('.delete-icon')) {
          return;
        }

        const zona = zonaInput.value;
        if (!zona) {
          showStatusMessage('⚠️ Mohon pilih Zona terlebih dahulu sebelum menambahkan hewan.', 'error', statusMessage);
          return;
        }

        if (animalName === lastClickedAnimal) {
          currentAnimalClickCount++;
        } else {
          currentAnimalClickCount = 1;
          lastClickedAnimal = animalName;
        }

        namaHewanInput.value = animalName;
        jumlahInput.value = currentAnimalClickCount;

        addOrUpdateStagedReport(animalName, zona, 1);
        // Menghapus baris berikut agar tidak mengarah ke atas atau fokus ke Nama Hewan
        // namaHewanInput.focus();
      });

      // Tambahkan event klik untuk ikon hapus
      const deleteIcon = button.querySelector('.delete-icon');
      deleteIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Mencegah klik tombol utama
        removeQuickAnimal(animalName);
      });

      quickAnimalsGrid.appendChild(button);
    });
  }

  /**
   * Menambahkan hewan ke daftar pilihan cepat
   * @param {string} animalName - Nama hewan yang akan ditambahkan.
   */
  function addQuickAnimal(animalName) {
    if (!animalName || animalName.trim() === '') {
      showStatusMessage('⚠️ Nama hewan tidak boleh kosong.', 'error', statusMessage);
      return;
    }

    const formattedName = animalName.trim().replace(/\b\w/g, (l) => l.toUpperCase());

    // Periksa apakah hewan sudah ada (tidak peka huruf besar/kecil)
    const exists = quickAnimalsList.some((animal) => animal.toLowerCase() === formattedName.toLowerCase());

    if (exists) {
      showStatusMessage('⚠️ Hewan sudah ada dalam daftar pilihan cepat.', 'error', statusMessage);
      return;
    }

    // Tambahkan ke daftar
    quickAnimalsList.push(formattedName);
    saveQuickAnimalsList();
    renderQuickAnimals();

    showStatusMessage(`✅ "${formattedName}" berhasil ditambahkan ke pilihan cepat!`, 'success', statusMessage);
  }

  /**
   * Menghapus hewan dari daftar pilihan cepat
   * @param {string} animalName - Nama hewan yang akan dihapus.
   */
  function removeQuickAnimal(animalName) {
    const index = quickAnimalsList.findIndex((animal) => animal.toLowerCase() === animalName.toLowerCase());

    if (index > -1) {
      quickAnimalsList.splice(index, 1);
      saveQuickAnimalsList();
      renderQuickAnimals();

      showStatusMessage(`🗑️ "${animalName}" dihapus dari pilihan cepat.`, 'info', statusMessage);
    }
  }

  /**
   * Menambah atau memperbarui laporan sementara
   * @param {string} namaHewan - Nama hewan.
   * @param {string} zona - Zona lokasi.
   * @param {number} jumlahToAdd - Jumlah yang akan ditambahkan.
   */
  function addOrUpdateStagedReport(namaHewan, zona, jumlahToAdd) {
    const formattedNamaHewan = namaHewan.replace(/\b\w/g, (l) => l.toUpperCase());
    const currentDay = moment.tz('Asia/Jakarta').format('dddd');
    const currentDate = moment.tz('Asia/Jakarta').format('DD/MM/YYYY');
    const currentTime = moment.tz('Asia/Jakarta').format('HH:mm');

    const existingReportIndex = stagedReports.findIndex(
      (report) =>
        report.namaHewan.toLowerCase().trim() === formattedNamaHewan.toLowerCase().trim() && report.zona.toLowerCase().trim() === zona.toLowerCase().trim() && (report.hari || '').toLowerCase().trim() === currentDay.toLowerCase().trim()
    );

    if (existingReportIndex > -1) {
      stagedReports[existingReportIndex].jumlah += jumlahToAdd;
      stagedReports[existingReportIndex].hari = currentDay;
      stagedReports[existingReportIndex].tanggal = currentDate;
      stagedReports[existingReportIndex].waktu = currentTime;
      // Weather should persist if already set, otherwise remain empty
      if (!stagedReports[existingReportIndex].weather) {
        stagedReports[existingReportIndex].weather = ''; // Initialize if not present
      }
    } else {
      stagedReports.push({
        id: Date.now() + Math.random(),
        namaHewan: formattedNamaHewan,
        zona: zona,
        jumlah: jumlahToAdd,
        hari: currentDay,
        tanggal: currentDate,
        waktu: currentTime,
        weather: '', // Initialize weather as empty for new reports
      });
    }

    console.log('Staged Reports setelah penambahan/pembaruan:', stagedReports); // DEBUG LOG
    saveStagedReports();
    renderStagingTable();
    showStatusMessage('✅ Laporan berhasil ditambahkan ke daftar sementara!', 'success', statusMessage);
  }

  /**
   * Menghapus laporan sementara berdasarkan ID
   * @param {number} id - ID laporan yang akan dihapus.
   */
  function deleteStagedReport(id) {
    stagedReports = stagedReports.filter((report) => report.id !== id);
    saveStagedReports();
    renderStagingTable();
    showStatusMessage('🗑️ Laporan dihapus dari daftar sementara.', 'info', stagingStatusMessage);
  }

  /**
   * Merender tabel sementara dengan wrapper untuk scrolling horizontal
   */
  function renderStagingTable() {
    if (stagedReports.length === 0) {
      stagingTableContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p class="text-slate-500 text-sm">Daftar laporan sementara kosong</p>
                    <p class="text-slate-400 text-xs mt-1">Tambahkan laporan menggunakan form di atas</p>
                </div>
            `;
      submitStagedDataButton.disabled = true;
      // Disable weather buttons if no reports staged
      weatherHujanBtn.disabled = true;
      weatherKeringBtn.disabled = true;
      return;
    }

    submitStagedDataButton.disabled = false;
    // Enable weather buttons if reports are staged
    weatherHujanBtn.disabled = false;
    weatherKeringBtn.disabled = false;

    let tableHTML = `
            <div class="table-container">
                <table class="w-full text-sm text-left text-slate-600">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th scope="col" class="px-4 py-3 font-semibold">Nama Hewan</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Zona</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Jumlah</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Cuaca</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Hari</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Tanggal</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Waktu</th>
                            <th scope="col" class="px-4 py-3 font-semibold">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-slate-200">
        `;

    stagedReports.forEach((report) => {
      tableHTML += `
                <tr class="hover:bg-slate-50 transition-colors" data-id="${report.id}">
                    <td class="px-4 py-3 font-medium text-slate-900">${report.namaHewan}</td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ${report.zona}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-green-100 text-green-800">
                            ${report.jumlah}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          report.weather === 'Hujan' ? 'bg-indigo-100 text-indigo-800' : report.weather === 'Kering' ? 'bg-orange-100 text-orange-800' : 'text-slate-400 bg-slate-50'
                        }">
                            ${report.weather || 'Belum dipilih'}
                        </span>
                    </td>
                    <td class="px-4 py-3">${report.hari}</td>
                    <td class="px-4 py-3">${report.tanggal}</td>
                    <td class="px-4 py-3">${report.waktu}</td>
                    <td class="px-4 py-3">
                        <button class="delete-btn inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-xs font-medium" data-id="${report.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                            </svg>
                            Hapus
                        </button>
                    </td>
                </tr>
            `;
    });

    tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

    stagingTableContainer.innerHTML = tableHTML;

    // Tambahkan event listener untuk tombol hapus
    stagingTableContainer.querySelectorAll('.delete-btn').forEach((button) => {
      button.addEventListener('click', (e) => {
        const idToDelete = Number.parseFloat(e.currentTarget.dataset.id);
        deleteStagedReport(idToDelete);
      });
    });
  }

  /**
   * Memuat dan menampilkan data spreadsheet global
   */
  async function loadGlobalSpreadsheetData() {
    showStatusMessage('⏳ Memuat data global dari spreadsheet...', 'info', statusMessage);
    tabelDataContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg class="animate-spin h-8 w-8 mx-auto text-primary-indigo mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p class="text-slate-500 text-sm">Memuat data dari spreadsheet...</p>
                </div>
            `;

    searchInput.value = '';
    searchInput.disabled = true; // Disable search while loading

    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) {
        throw new Error(`Gagal terhubung ke server (status: ${response.status})`);
      }

      const data = await response.json();

      if (data.result === 'error') {
        throw new Error(data.error);
      }

      let processedData = [];
      if (Array.isArray(data) && data.length > 0) {
        if (typeof data[0] === 'object' && data[0] !== null && 'jenis hewan' in data[0]) {
          processedData = data;
        } else if (Array.isArray(data[0]) && data.length > 1) {
          const headers = data[0];
          processedData = data.slice(1).map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header.toLowerCase().trim()] = row[index];
            });
            return obj;
          });
        }
      }

      rawGlobalData = processedData; // Store all data for filtering later

      // Urutkan data berdasarkan tanggal dan waktu (terbaru pertama)
      // Lakukan pengurutan pada rawGlobalData
      rawGlobalData.sort((a, b) => {
        try {
          const parseDateTime = (dateStr, timeStr) => {
            if (!dateStr || !timeStr) return new Date(0);

            if (typeof dateStr === 'number') {
              const excelEpoch = new Date('1899-12-30T00:00:00.000Z');
              const days = Math.floor(dateStr);
              const fractionalDay = dateStr - days;
              const millisecondsInADay = 24 * 60 * 60 * 1000;

              const jsDate = new Date(excelEpoch.getTime() + days * millisecondsInADay);
              jsDate.setUTCMilliseconds(jsDate.getUTCMilliseconds() + fractionalDay * millisecondsInADay);
              return jsDate;
            } else if (typeof dateStr === 'string' && dateStr.includes('T') && dateStr.endsWith('Z')) {
              return moment.tz(dateStr, 'YYYY-MM-DDTHH:mm:ss.SSSZ', 'Asia/Jakarta').toDate();
            } else {
              const [day, month, year] = dateStr.split('/');
              const [hour, minute] = timeStr.split(':');
              return new Date(Date.UTC(year, month - 1, day, hour, minute));
            }
          };

          const dateA = parseDateTime(a['tanggal'], a['waktu']);
          const dateB = parseDateTime(b['tanggal'], b['waktu']);
          return dateB.getTime() - dateA.getTime(); // Urutkan menurun (terbaru pertama)
        } catch (e) {
          console.error('Error mengurai tanggal/waktu untuk pengurutan:', e);
          return 0; // Pertahankan urutan asli jika pengurutan gagal
        }
      });

      // Tampilkan data yang sudah diurutkan (atau difilter)
      renderGlobalTableWithLimit(rawGlobalData);

      if (rawGlobalData.length === 0) {
        showStatusMessage('📊 Data laporan global kosong.', 'info', statusMessage);
      } else {
        showStatusMessage('✅ Data global berhasil dimuat dari spreadsheet.', 'success', statusMessage);
      }

      searchInput.disabled = false; // Enable search after data loads
    } catch (error) {
      showStatusMessage(`❌ Gagal memuat data global: ${error.message}`, 'error', statusMessage);
      tabelDataContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-red-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p class="text-red-500 text-sm font-medium">Gagal memuat data global</p>
                    <p class="text-slate-400 text-xs mt-1">${error.message}</p>
                </div>
            `;
      console.error('Error memuat data global:', error);
    }
  }

  /**
   * Menampilkan data spreadsheet global dalam format tabel dengan batasan 20 baris dan wrapper untuk scrolling horizontal.
   * @param {Array<Object>} dataToRender - Data yang akan ditampilkan.
   */
  function renderGlobalTableWithLimit(dataToRender) {
    const limitedData = dataToRender.slice(0, 20); // Ambil hanya 20 data teratas

    if (limitedData.length === 0) {
      tabelDataContainer.innerHTML = `
                <div class="text-center py-12">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h10a4 4 0 014 4v12a4 4 0 01-4 4z" />
                    </svg>
                    <p class="text-slate-500 text-sm">Belum ada data laporan global yang tersedia</p>
                    <p class="text-slate-400 text-xs mt-1">Data akan muncul setelah laporan disimpan ke spreadsheet</p>
                </div>
            `;
      return;
    }

    const headers = [
      { key: 'jenis hewan', label: 'Jenis Hewan', class: 'font-medium text-slate-900' },
      { key: 'zona 1', label: 'Zona 1', class: 'text-center' },
      { key: 'zona 2', label: 'Zona 2', class: 'text-center' },
      { key: 'zona 3', label: 'Zona 3', class: 'text-center' },
      { key: 'zona 4 (mm)', label: 'Zona 4 (MM)', class: 'text-center' },
      { key: 'zona 4 (dvor)', label: 'Zona 4 (DVOR)', class: 'text-center' },
      { key: 'zona 4 (15)', label: 'Zona 4 (15)', class: 'text-center' },
      { key: 'zona 5', label: 'Zona 5', class: 'text-center' },
      { key: 'cuaca', label: 'Cuaca', class: 'text-center' },
      { key: 'hari', label: 'Hari', class: '' },
      { key: 'tanggal', label: 'Tanggal', class: '' },
      { key: 'waktu', label: 'Waktu', class: '' },
      { key: 'total', label: 'Total', class: 'font-semibold text-primary-indigo text-center' },
    ];

    let tableHTML = `
            <div class="table-container">
                <table class="w-full text-sm text-left text-slate-600">
                    <thead class="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                        <tr>
        `;

    headers.forEach((header) => {
      tableHTML += `<th scope="col" class="px-4 py-3 font-semibold ${header.class}">${header.label}</th>`;
    });

    tableHTML += `
                        </tr>
                    </thead>
                    <tbody class="bg-white divide-y divide-slate-200">
        `;

    limitedData.forEach((row) => {
      // Use limitedData here
      tableHTML += `<tr class="hover:bg-slate-50 transition-colors">`;

      headers.forEach((header) => {
        let cellValue = row[header.key];
        const cellClass = `px-4 py-3 ${header.class}`;

        if (header.key === 'tanggal') {
          let formattedDate = '';
          if (typeof cellValue === 'number') {
            const excelEpoch = new Date('1899-12-30T00:00:00.000Z');
            const jsDate = new Date(excelEpoch.getTime() + cellValue * 24 * 60 * 60 * 1000);
            formattedDate = moment(jsDate).format('DD/MM/YYYY');
          } else if (typeof cellValue === 'string' && cellValue.includes('T') && cellValue.endsWith('Z')) {
            formattedDate = moment.tz(cellValue, 'Asia/Jakarta').format('DD/MM/YYYY');
          } else if (cellValue) {
            formattedDate = moment(cellValue, 'DD/MM/YYYY').format('DD/MM/YYYY');
          }
          cellValue = formattedDate || '<span class="text-slate-300">-</span>';
          cellValue = `<span class="text-slate-600 font-mono">${cellValue}</span>`;
        } else if (header.key === 'waktu') {
          let formattedTime = '';
          if (typeof cellValue === 'number') {
            const date = new Date(Math.round(cellValue * 24 * 60 * 60 * 1000));
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          } else if (typeof cellValue === 'string' && cellValue.includes('T') && cellValue.endsWith('Z')) {
            formattedTime = moment.tz(cellValue, 'Asia/Jakarta').format('HH:mm');
          } else if (cellValue) {
            formattedTime = moment(cellValue, 'HH:mm').format('HH:mm');
          }
          cellValue = formattedTime || '<span class="text-slate-300">-</span>';
          cellValue = `<span class="text-slate-600 font-mono">${cellValue}</span>`;
        } else if (header.key === 'jenis hewan') {
          cellValue = `<span class="font-medium text-slate-900">${cellValue || '<span class="text-slate-300">-</span>'}</span>`;
        } else if (header.key.includes('zona')) {
          if (cellValue === null || cellValue === '' || cellValue === 0) {
            cellValue = `<span class="text-slate-300">-</span>`;
          } else {
            cellValue = `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${cellValue}</span>`;
          }
        } else if (header.key === 'total') {
          if (cellValue === null || cellValue === '' || cellValue === 0) {
            cellValue = `<span class="text-slate-300">-</span>`;
          } else {
            cellValue = `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">${cellValue}</span>`;
          }
        } else if (header.key === 'cuaca') {
          if (cellValue === null || cellValue === '') {
            cellValue = `<span class="text-slate-300">-</span>`;
          } else {
            cellValue = `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${cellValue.toLowerCase() === 'hujan' ? 'bg-indigo-100 text-indigo-800' : 'bg-orange-100 text-orange-800'}">${cellValue}</span>`;
          }
        } else if (cellValue === null || cellValue === '') {
          cellValue = `<span class="text-slate-300">-</span>`;
        }

        tableHTML += `<td class="${cellClass}">${cellValue}</td>`;
      });

      tableHTML += `</tr>`;
    });

    tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

    tabelDataContainer.innerHTML = tableHTML;
    // Search input remains enabled as it filters the 20 displayed rows
    searchInput.disabled = false;
  }

  /**
   * Menyaring tabel berdasarkan input pencarian pada data yang ditampilkan (20 teratas).
   * Jika Anda ingin pencarian dilakukan pada *semua* data dan kemudian hanya menampilkan 20 hasil teratas dari pencarian,
   * Anda perlu memodifikasi `loadGlobalSpreadsheetData` dan `filterTable` untuk bekerja dengan `rawGlobalData`.
   */
  function filterTable() {
    const searchTerm = searchInput.value.toLowerCase();

    // Filter the *entire* rawGlobalData, then display the top 20 of the filtered results
    const filteredAndSorted = rawGlobalData.filter((row) => {
      return Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm));
    });

    // Re-render the table with the filtered (and implicitly sorted) data, limited to 20
    renderGlobalTableWithLimit(filteredAndSorted);
  }

  // Event Listeners
  window.addEventListener('DOMContentLoaded', () => {
    loadStagedReports();
    loadQuickAnimalsList();
    loadGlobalSpreadsheetData(); // Memuat dan menampilkan data global dengan batas 20
  });

  // Tambahkan fungsi pencarian
  if (searchInput) {
    searchInput.addEventListener('keyup', filterTable);
  }

  // Event listener tombol Simpan ke Pilihan Cepat
  saveToQuickSelectBtn.addEventListener('click', () => {
    const animalName = namaHewanInput.value.trim();
    addQuickAnimal(animalName);
  });

  // Pengiriman formulir
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const namaHewan = namaHewanInput.value.trim();
    const zona = zonaInput.value;
    const jumlah = Number.parseInt(jumlahInput.value, 10);

    if (!namaHewan || !zona || isNaN(jumlah) || jumlah < 1) {
      showStatusMessage('⚠️ Mohon lengkapi semua bidang dengan benar (Nama Hewan, Zona, dan Jumlah harus diisi dengan angka positif).', 'error', statusMessage);
      return;
    }

    addOrUpdateStagedReport(namaHewan, zona, jumlah);

    namaHewanInput.value = '';
    jumlahInput.value = 1;
    currentAnimalClickCount = 0;
    lastClickedAnimal = '';
    namaHewanInput.focus();
  });

  // Event listener untuk tombol cuaca
  function applyWeatherToStagedReports(weatherCondition) {
    if (stagedReports.length === 0) {
      showStatusMessage('ℹ️ Tidak ada laporan dalam daftar sementara untuk diterapkan cuaca.', 'info', weatherStatusMessage);
      return;
    }

    stagedReports = stagedReports.map((report) => ({
      ...report,
      weather: weatherCondition,
    }));
    console.log(`Cuaca "${weatherCondition}" diterapkan ke laporan sementara:`, stagedReports); // DEBUG LOG
    saveStagedReports();
    renderStagingTable();
    showStatusMessage(`✅ Cuaca disetel ke "${weatherCondition}" untuk semua laporan sementara.`, 'success', weatherStatusMessage);
  }

  weatherHujanBtn.addEventListener('click', () => applyWeatherToStagedReports('Hujan'));
  weatherKeringBtn.addEventListener('click', () => applyWeatherToStagedReports('Kering'));

  // Kirim data yang di-staged
  submitStagedDataButton.addEventListener('click', async () => {
    if (stagedReports.length === 0) {
      showStatusMessage('ℹ️ Daftar laporan sementara kosong, tidak ada yang perlu disimpan.', 'info', stagingStatusMessage);
      return;
    }

    submitStagedDataButton.disabled = true;
    submitStagedDataButton.innerHTML = `
                <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
            `;
    showStatusMessage(`⏳ Menyimpan ${stagedReports.length} laporan ke Spreadsheet...`, 'info', stagingStatusMessage);

    let successCount = 0;
    const errorMessages = [];

    const promises = stagedReports.map(async (report) => {
      const formData = new FormData();
      formData.append('namaHewan', report.namaHewan);
      formData.append('zona', report.zona);
      formData.append('jumlah', report.jumlah);
      formData.append('cuaca', report.weather || ''); // Include weather, send empty string if not set

      console.log('Mengirim laporan (frontend):', { namaHewan: report.namaHewan, zona: report.zona, jumlah: report.jumlah, cuaca: report.weather }); // DEBUG LOG: Cek data yang dikirim

      try {
        const response = await fetch(SCRIPT_URL, { method: 'POST', body: formData });
        const result = await response.json();
        console.log('Respon Apps Script untuk laporan (frontend):', report.namaHewan, result); // DEBUG LOG: Cek respons dari Apps Script

        if (result.result === 'success') {
          return { status: 'fulfilled', value: report };
        } else {
          return {
            status: 'rejected',
            reason: `Gagal menyimpan ${report.namaHewan} (${report.zona}): ${result.error || 'Kesalahan tidak diketahui'}`,
          };
        }
      } catch (err) {
        console.error('Fetch error untuk laporan (frontend):', report.namaHewan, err); // DEBUG LOG: Cek error jaringan
        return {
          status: 'rejected',
          reason: `Gagal koneksi untuk ${report.namaHewan} (${report.zona}): ${err.message}`,
        };
      }
    });

    const results = await Promise.allSettled(promises);

    results.forEach((result) => {
      if (result.status === 'fulfilled') successCount++;
      else errorMessages.push(result.reason);
    });

    if (errorMessages.length === 0) {
      showStatusMessage(`✅ Berhasil menyimpan ${successCount} laporan ke Spreadsheet!`, 'success', stagingStatusMessage);
      stagedReports = [];
      saveStagedReports();
      renderStagingTable();
      loadGlobalSpreadsheetData(); // Refresh global data after saving
    } else {
      const displayErrorMessage = errorMessages.length > 3 ? `${errorMessages.slice(0, 3).join('; ')}... (${errorMessages.length - 3} lainnya)` : errorMessages.join('; ');
      showStatusMessage(`⚠️ Berhasil menyimpan ${successCount} laporan. ${errorMessages.length} gagal: ${displayErrorMessage}`, 'error', stagingStatusMessage);
      console.error('Kesalahan selama pengiriman batch (frontend):', errorMessages);
    }

    submitStagedDataButton.disabled = false;
    submitStagedDataButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
                </svg>
                Simpan Semua
            `;
  });

  // Tombol Unduh Excel
  downloadExcelButton.onclick = () => {
    const downloadUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx`;
    window.open(downloadUrl, '_blank');
  };

  // New: Tombol Go to Spreadsheet
  goToSpreadsheetBtn.onclick = () => {
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit?usp=sharing`;
    window.open(spreadsheetUrl, '_blank');
  };
});
