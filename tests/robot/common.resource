*** Settings ***
Library    SeleniumLibrary    timeout=15s

*** Variables ***
${BASE_URL}    https://bisara-ebon.vercel.app
${WAIT}        15s

*** Keywords ***
Open BISARA Browser
    ${options}=    Evaluate    sys.modules['selenium.webdriver'].ChromeOptions()    modules=selenium.webdriver
    ${headless}=    Set Variable    --headless=new
    ${window_size}=    Set Variable    --window-size=1440,900
    Call Method    ${options}    add_argument    ${headless}
    Call Method    ${options}    add_argument    ${window_size}
    Open Browser    ${BASE_URL}    chrome    options=${options}
    Set Screenshot Directory    ${OUTPUT DIR}${/}screenshots
    Register Keyword To Run On Failure    Capture Page Screenshot
    Wait Until Element Is Visible    css:header    ${WAIT}

Close BISARA Browser
    Close All Browsers

Open BISARA Page
    [Arguments]    ${path}
    Go To    ${BASE_URL}${path}
    Wait Until Element Is Visible    css:main    ${WAIT}

Page Path Should Be
    [Arguments]    ${path}
    Wait Until Location Contains    ${BASE_URL}${path}    ${WAIT}
