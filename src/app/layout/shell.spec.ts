import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { provideRouter } from '@angular/router';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        // Sin sesión el Shell redirige a /login: la ruta debe existir en el router de la prueba.
        provideRouter([{ path: 'login', children: [] }]),
        { provide: SwUpdate, useValue: { isEnabled: false } },
      ],
    }).compileComponents();
  });

  it('muestra la marca, las secciones principales, las de «Más» y cerrar sesión', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.side .brand')?.textContent).toContain('Metas');
    expect(el.querySelectorAll('.side a.item').length).toBe(9);
    expect(el.querySelector('.side .side-foot')?.textContent).toContain('Cerrar sesión');
    expect(el.querySelectorAll('.bottom-nav a.item').length).toBe(5);
  });

  it('el botón de la marca contrae y expande el menú', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const app = el.querySelector('.app') as HTMLElement;
    (el.querySelector('.side .brand') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(app.classList.contains('contraido')).toBe(true);
    (el.querySelector('.side .brand') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(app.classList.contains('contraido')).toBe(false);
  });
});
