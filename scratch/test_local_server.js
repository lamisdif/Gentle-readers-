async function check() {
  const r = await fetch('http://localhost:8080/public/manager/index.html');
  console.log('Local Manager HTTP:', r.status, r.statusText);
}
check().catch(console.error);
