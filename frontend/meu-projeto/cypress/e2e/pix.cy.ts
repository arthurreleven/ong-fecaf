describe('Fluxo PIX', () => {

  it('deve gerar um pix', () => {

    cy.visit('http://localhost:5173')

    cy.contains('Quero Doar')
      .click()

    cy.get('input[placeholder="Outro valor (R$)"]')
      .type('20')

    cy.get('input[placeholder="Como prefere ser chamado?"]')
      .type('Arthur')

    cy.get('input[placeholder="seu@email.com"]')
      .type('arthur@email.com')

    cy.contains('💚 Doar R$ 20,00 via Pix')
      .click()

  })

})