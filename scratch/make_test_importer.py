import base64

with open(r'C:\Users\DELL PRO\Desktop\Gentle_Readers_Inventory_Starterhereeeee.xlsx', 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

test_runner_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Manager Importer Test</title>
</head>
<body>
    <iframe id="mgr-frame" src="/public/manager/index.html" style="width: 1200px; height: 900px;"></iframe>
    <div id="test-log" style="white-space: pre; font-family: monospace;"></div>

    <script>
    const logEl = document.getElementById('test-log');
    function log(msg) {{
        console.log(msg);
        logEl.textContent += msg + "\\n";
    }}

    window.addEventListener('load', () => {{
        setTimeout(() => {{
            try {{
                const iframe = document.getElementById('mgr-frame');
                const iWin = iframe.contentWindow;
                const iDoc = iframe.contentDocument;

                log("Iframe loaded");

                // Check XLSX availability
                if (typeof iWin.XLSX === 'undefined') {{
                    log("ERROR: iWin.XLSX is undefined!");
                    return;
                }}
                log("XLSX is loaded in iframe");

                // Simulate reading file
                const b64 = "{b64_data}";
                const binStr = atob(b64);
                const bytes = new Uint8Array(binStr.length);
                for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
                
                log("Parsing workbook with XLSX.read...");
                const wb = iWin.XLSX.read(bytes, {{ type: 'array', cellDates: true }});
                log("Workbook sheets: " + JSON.stringify(wb.SheetNames));

                iWin.state.excelWorkbook = wb;

                log("Calling parseWorkbookData(wb)...");
                iWin.parseWorkbookData(wb);
                log("state.excelParsedData keys: " + JSON.stringify(Object.keys(iWin.state.excelParsedData)));
                log("newBatch rows: " + (iWin.state.excelParsedData.newBatch ? iWin.state.excelParsedData.newBatch.length : 0));
                log("oldStock rows: " + (iWin.state.excelParsedData.oldStock ? iWin.state.excelParsedData.oldStock.length : 0));
                log("accessories rows: " + (iWin.state.excelParsedData.accessories ? iWin.state.excelParsedData.accessories.length : 0));
                log("debts rows: " + (iWin.state.excelParsedData.debts ? iWin.state.excelParsedData.debts.length : 0));
                log("opening rows: " + (iWin.state.excelParsedData.opening ? iWin.state.excelParsedData.opening.length : 0));

                log("Calling showImporterPreview()...");
                iWin.openModal('modal-excel-import');
                iWin.showImporterPreview();

                // Check table rendered in DOM
                const thead = iDoc.getElementById('importer-preview-thead');
                const tbody = iDoc.getElementById('importer-preview-tbody');
                log("thead HTML: " + (thead ? thead.innerHTML : "NOT FOUND"));
                log("tbody rows rendered: " + (tbody ? tbody.children.length : "NOT FOUND"));
                if (tbody && tbody.children.length > 0) {{
                    log("First rendered row HTML: " + tbody.children[0].innerHTML);
                }}

                // Test switching to each sheet
                ['NEW BATCH', 'OLD STOCK', 'ACCESSORIES', 'DEBTS', 'OPENING POSITION'].forEach(sheet => {{
                    log("Testing switchImporterSheet('" + sheet + "')...");
                    iWin.switchImporterSheet(sheet);
                    log("  " + sheet + " tbody rows: " + tbody.children.length);
                }});

                log("SUCCESS: All steps executed without throwing.");
            }} catch(err) {{
                log("ERROR: " + err.message + "\\n" + err.stack);
            }}
        }}, 2000);
    }});
    </script>
</body>
</html>
"""

with open('scratch/test_manager_importer.html', 'w', encoding='utf-8') as f:
    f.write(test_runner_html)

print("Created scratch/test_manager_importer.html")
