*** Settings ***
Resource         common.resource
Suite Setup      Open BISARA Browser
Suite Teardown   Close BISARA Browser

*** Test Cases ***
Homepage Opens
    Open BISARA Page    /
    Wait Until Element Is Visible    css:a[aria-label="BISARA, kembali ke beranda"]    ${WAIT}
    Page Should Contain Element    css:nav[aria-label="Navigasi utama"]
