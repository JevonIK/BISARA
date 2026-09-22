# BISARA automated UI smoke tests

- **Testing tools:** Robot Framework + SeleniumLibrary (headless Chrome).
- **Target URL:** https://bisara-ebon.vercel.app
- **Scope:** tujuh pemeriksaan UI dasar; tidak mengubah data belajar atau menguji ketepatan gerakan.
- **Test cases executed:** homepage opens; main navigation works; registration/login forms open; invalid login shows error; Kamus opens and search works; learning/mission page loads; Tirukan page loads and camera button exists.
- **Result (2026-09-22):** Total 7 / Passed 7 / Failed 0. Tidak ada tes gagal pada run terakhir. Pada run sebelumnya, tes formulir akun sempat gagal karena halaman masih “Memeriksa sesi…”; setelah wait eksplisit ditambahkan, tes lulus.
- **Intentionally not automated:** akurasi checker kamera, gerakan BISINDO fisik, dan izin/peragaan kamera nyata.

Install dependencies with `python3 -m pip install -r tests/robot/requirements.txt`, then run from the repository root:

```sh
robot --outputdir tests/robot/results tests/robot/
```

Robot Framework generates [report.html](../tests/robot/results/report.html), [log.html](../tests/robot/results/log.html), and [output.xml](../tests/robot/results/output.xml). SeleniumLibrary saves screenshots in `tests/robot/results/screenshots/` when a test fails.
