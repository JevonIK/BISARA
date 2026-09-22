*** Settings ***
Resource         common.resource
Suite Setup      Open BISARA Browser
Suite Teardown   Close BISARA Browser

*** Test Cases ***
Main Navigation Works
    Open BISARA Page    /
    Click Element    css:nav[aria-label="Navigasi utama"] a[href="/kamus"]
    Page Path Should Be    /kamus
    Click Element    css:nav[aria-label="Navigasi utama"] a[href="/profil"]
    Page Path Should Be    /profil
    Click Element    css:nav[aria-label="Navigasi utama"] a[href="/"]
    Wait Until Location Is    ${BASE_URL}/    ${WAIT}

Kamus Opens And Search Works
    Open BISARA Page    /kamus
    Wait Until Element Is Visible    css:input[placeholder="Cari kata atau isyarat..."]    ${WAIT}
    Input Text    css:input[placeholder="Cari kata atau isyarat..."]    teman
    Wait Until Element Is Visible    xpath://span[normalize-space()="Teman"]    ${WAIT}
    Page Should Not Contain Element    xpath://span[normalize-space()="Air"]
    Click Button    css:button[aria-label="Hapus pencarian"]
    Wait Until Element Is Visible    xpath://span[normalize-space()="Air"]    ${WAIT}

Learning Mission Page Loads
    Open BISARA Page    /missions/learn?mission=alfabet-a-e
    Wait Until Element Is Visible    css:h1    ${WAIT}
    Page Should Contain    A–E
    Page Should Contain Element    css:video

Tirukan Page Loads With Camera Button
    Open BISARA Page    /missions/learn?mission=alfabet-a-e&section=tirukan
    Wait Until Element Is Visible    xpath://button[contains(normalize-space(),"Aktifkan kamera")]    ${WAIT}
    Page Should Contain    Tirukan
