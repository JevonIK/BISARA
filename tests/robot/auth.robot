*** Settings ***
Resource         common.resource
Suite Setup      Open BISARA Browser
Suite Teardown   Close BISARA Browser

*** Test Cases ***
Registration And Login Forms Open
    Open BISARA Page    /account
    Wait Until Element Is Visible    xpath://button[normalize-space()="Daftar"]    ${WAIT}
    Click Button    xpath://button[normalize-space()="Daftar"]
    Wait Until Element Is Visible    css:input[name="displayName"]    ${WAIT}
    Page Should Contain Element    css:button[type="submit"]
    Click Button    xpath://button[normalize-space()="Masuk"]
    Wait Until Element Is Visible    css:input[name="email"]    ${WAIT}
    Page Should Contain Element    css:input[name="password"]

Invalid Login Shows Error
    Open BISARA Page    /account
    Wait Until Element Is Visible    css:input[name="email"]    ${WAIT}
    Input Text    css:input[name="email"]       robot.invalid@example.com
    Input Text    css:input[name="password"]    WrongPassword123!
    Click Button    css:button[type="submit"]
    Wait Until Element Contains    css:p[role="alert"]    kata sandi tidak cocok    ${WAIT}
