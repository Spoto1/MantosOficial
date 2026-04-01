(async () => {
  await page.getByRole("textbox", { name: "Nome" }).fill("Runtime Contact");
  await page.locator("#main-content").getByRole("textbox", { name: "E-mail" }).fill("runtime@mantos.local");
  await page.getByRole("textbox", { name: "Telefone" }).fill("(11) 99999-0000");
  await page.getByRole("textbox", { name: "Assunto" }).fill("Teste runtime");
  await page.getByRole("textbox", { name: "Mensagem" }).fill("Mensagem de teste com tamanho suficiente para validar o fluxo.");
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await page.waitForTimeout(2000);
  const feedback = await page.locator("form p[aria-live='polite']").allTextContents();
  const values = {
    name: await page.getByRole("textbox", { name: "Nome" }).inputValue(),
    email: await page.locator("#main-content").getByRole("textbox", { name: "E-mail" }).inputValue(),
    subject: await page.getByRole("textbox", { name: "Assunto" }).inputValue(),
    message: await page.getByRole("textbox", { name: "Mensagem" }).inputValue(),
  };
  return JSON.stringify({ feedback, values, url: page.url() }, null, 2);
})()
