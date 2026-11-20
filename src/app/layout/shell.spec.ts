import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      // Sin sesión el Shell redirige a /login: la ruta debe existir en el router de la prueba.
      providers: [provideRouter([{ path: 'login', children: [] }])],
    }).compileComponents();
  });

  it('should render the brand, the five sections and logout', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.side-nav .brand')?.textContent).toContain('Metas');
    expect(el.querySelectorAll('.side-nav a.nav-item').length).toBe(5);
    expect(el.querySelector('.side-nav .logout')?.textContent).toContain('Cerrar sesión');
  });
});
