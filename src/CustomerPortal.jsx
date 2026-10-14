import { useEffect, useMemo, useState } from 'react';
import { formatMoney } from './format.js';

const partSymbols = {
  pump: '◈',
  bearing: '◎',
  valve: '⊗',
  seal: '▣',
  motor: '⌁',
  coupling: '◉',
  filter: '▤',
  gear: '⚙'
};

const profileFields = [
  { id: 'company', label: 'Company name', placeholder: 'Registered company name', autocomplete: 'organization' },
  { id: 'gstNo', label: 'GST number', placeholder: '22AAAAA0000A1Z5', maxLength: 15 },
  { id: 'email', label: 'Email address', placeholder: 'you@company.com', type: 'email', autocomplete: 'email' },
  { id: 'phone', label: 'Phone number', placeholder: '+91 98765 43210', type: 'tel', autocomplete: 'tel' }
];

function Brand() {
  return <a className="brand" href="#home" aria-label="W-COM customer home"><span className="brand-mark"><span>W</span></span><span className="brand-copy"><strong>W-COM</strong><small>WAHAN COMMERCE</small></span></a>;
}

function PartCard({ product, onAdd }) {
  return (
    <article className="customer-product-card">
      <div className={`customer-part-visual part-art-${product.accent}`}>
        <div className="customer-part-orbit" />
        <span className="customer-part-symbol">{partSymbols[product.icon] || partSymbols.gear}</span>
        <span className="customer-part-code">{product.partNumber}</span>
        <button className="quick-add" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to request`}><span>+</span></button>
      </div>
      <div className="customer-part-details">
        <span className="product-category">{product.category}</span>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="customer-part-bottom"><strong>{formatMoney(product.price)}<small> / unit</small></strong><span className="stock-pill stock-in"><i /> {product.stock} in stock</span></div>
      </div>
    </article>
  );
}

function EmptyPanel({ title, description, icon }) {
  return <div className="empty-state"><span className="empty-icon">{icon}</span><h3>{title}</h3><p>{description}</p></div>;
}

export default function CustomerPortal({ user, onSignOut }) {
  const [page, setPage] = useState('overview');
  const [profile, setProfile] = useState({
    company: user.company,
    gstNo: user.gstNo,
    email: user.email,
    phone: user.phone,
    salesRepresentative: user.salesRepresentative || ''
  });
  const [profileForm, setProfileForm] = useState({
    company: user.company,
    gstNo: user.gstNo,
    email: user.email,
    phone: user.phone
  });
  const [products, setProducts] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All parts');
  const [paymentDays, setPaymentDays] = useState('0');
  const [cartOpen, setCartOpen] = useState(false);
  const [requestFormOpen, setRequestFormOpen] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [requestSaving, setRequestSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCustomerData = async () => {
    const [productsResponse, quotationsResponse, profileResponse] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/customer/quotations'),
      fetch('/api/customer/profile')
    ]);
    const responses = [productsResponse, quotationsResponse, profileResponse];
    const failedResponse = responses.find((response) => !response.ok);
    if (failedResponse) {
      const result = await failedResponse.json();
      throw new Error(result.error || 'Unable to load your customer workspace.');
    }
    const [productList, quotationList, customerProfile] = await Promise.all(responses.map((response) => response.json()));
    setProducts(productList);
    setQuotations(quotationList);
    setProfile(customerProfile);
    setProfileForm({
      company: customerProfile.company,
      gstNo: customerProfile.gstNo,
      email: customerProfile.email,
      phone: customerProfile.phone
    });
  };

  useEffect(() => {
    loadCustomerData()
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(''), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const categories = useMemo(() => ['All parts', ...new Set(products.map((product) => product.category))], [products]);
  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => (
      (category === 'All parts' || product.category === category) &&
      (!query || `${product.name} ${product.partNumber} ${product.description} ${product.category}`.toLowerCase().includes(query))
    ));
  }, [products, search, category]);
  const cartEntries = Object.entries(quantities).map(([id, quantity]) => ({
    product: products.find((item) => item.id === Number(id)),
    quantity
  })).filter((item) => item.product);
  const cartCount = cartEntries.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cartEntries.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const pendingCount = quotations.filter((quotation) => ['New', 'In review', 'Counter offer'].includes(quotation.status)).length;
  const categoriesCount = categories.length - 1;

  const updateQuantity = (productId, amount) => {
    setQuantities((current) => {
      const nextValue = (current[productId] || 0) + amount;
      const next = { ...current };
      if (nextValue < 1) delete next[productId];
      else next[productId] = Math.min(nextValue, 999);
      return next;
    });
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setProfileSaving(true);
    try {
      const response = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save your profile.');
      setProfile(result);
      setProfileForm({ company: result.company, gstNo: result.gstNo, email: result.email, phone: result.phone });
      await loadCustomerData();
      setNotice('Your customer details have been saved.');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    setError('');
    setRequestSaving(true);
    try {
      const response = await fetch('/api/customer/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileForm,
          paymentDays: Number(paymentDays),
          items: cartEntries.map(({ product, quantity }) => ({ productId: product.id, quantity }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to send your quotation request.');
      setQuantities({});
      setRequestFormOpen(false);
      setCartOpen(false);
      await loadCustomerData();
      setNotice(`Request ${result.reference} has been sent to the Wahan team.`);
      setPage('requests');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRequestSaving(false);
    }
  };

  const navigate = (nextPage) => {
    setPage(nextPage);
    setError('');
    setSearch('');
  };

  const pageLabels = { overview: 'Overview', catalogue: 'Product catalogue', requests: 'My requests', profile: 'My details' };
  const formatDate = (value) => new Date(`${value.replace(' ', 'T')}Z`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="app-shell customer-shell">
      <aside className="sidebar">
        <Brand />
        <div className="workspace-switch"><span className="workspace-monogram">WE</span><span className="workspace-info"><strong>{profile.company}</strong><small>Customer account</small></span></div>
        <div className="nav-label">YOUR WORKSPACE</div>
        <nav className="primary-nav" aria-label="Customer navigation">
          {[['overview', 'Overview', 'grid'], ['catalogue', 'Product catalogue', 'box'], ['requests', 'My requests', 'quote'], ['profile', 'My details', 'people']].map(([id, label, icon]) => (
            <button key={id} className={`nav-item ${page === id ? 'nav-item-active' : ''}`} onClick={() => navigate(id)}>
              <CustomerIcon name={icon} /><span>{label}</span>{id === 'requests' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <section className="integration-card"><div className="integration-head"><span className="integration-pulse" /> YOUR WAHAN CONTACT</div><div className="connection-row"><CustomerIcon name="people" /><span>{profile.salesRepresentative || 'Representative to be assigned'}</span></div><p>Your Wahan sales representative will help with quotations and product questions.</p></section>
        <button className="profile-button" onClick={onSignOut}><span className="profile-avatar">{profile.company.slice(0, 2).toUpperCase()}</span><span className="profile-copy"><strong>{profile.company}</strong><small>Sign out of customer portal</small></span><CustomerIcon name="logout" /></button>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumbs"><span>Customer portal</span><CustomerIcon name="chevron" /><strong>{pageLabels[page]}</strong></div><div className="topbar-actions"><label className="top-search"><CustomerIcon name="search" /><input value={search} onChange={(event) => { setSearch(event.target.value); if (page !== 'catalogue') setPage('catalogue'); }} placeholder="Search parts, part numbers..." aria-label="Search parts" /></label><span className="customer-top-avatar">{profile.company.slice(0, 2).toUpperCase()}</span></div></header>
        <div className="page-content">
          {error && <div className="alert alert-error" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}
          {page === 'overview' && <>
            <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER PORTAL</div><h1>Welcome, <span>{profile.company}</span></h1><p>Find the parts you need and keep your Wahan requests in one place.</p></div><button className="button button-primary" onClick={() => navigate('catalogue')}>Explore parts <CustomerIcon name="arrow" /></button></section>
            <section className="hero-banner customer-hero"><div className="hero-content"><span className="hero-kicker"><span /> YOUR W-COM CUSTOMER ACCOUNT</span><h2>The right parts.<br /><span>Right when you need them.</span></h2><p>Browse the Wahan catalogue, request a quote, and follow every request from your customer dashboard.</p><button className="button hero-button" onClick={() => navigate('catalogue')}>Explore catalogue <CustomerIcon name="arrow" /></button></div><div className="customer-hero-art"><span>W</span><i /><i /><i /></div><div className="hero-bottom"><span><i /> YOUR CUSTOMER WORKSPACE</span><span>CONNECTED WITH WAHAN</span></div></section>
            <section className="metrics-grid"><CustomerMetric label="Catalogue parts" value={products.length.toString().padStart(2, '0')} note={`${categoriesCount} categories`} icon="box" /><CustomerMetric label="My requests" value={quotations.length.toString().padStart(2, '0')} note="All quotation activity" icon="quote" /><CustomerMetric label="Needs attention" value={pendingCount.toString().padStart(2, '0')} note="Open with Wahan" icon="clock" /><CustomerMetric label="Assigned representative" value={profile.salesRepresentative || 'Pending'} note="Your Wahan contact" icon="people" /></section>
            <section className="section-heading"><div><span className="section-eyebrow">PARTS FOR YOUR BUSINESS</span><h2>Popular parts</h2><p>Add items to a request and our team will prepare a quotation.</p></div><button className="text-link" onClick={() => navigate('catalogue')}>Browse catalogue <CustomerIcon name="arrow" /></button></section>
            {loading ? <div className="customer-loading">Loading catalogue…</div> : <div className="product-grid">{products.slice(0, 4).map((product) => <PartCard key={product.id} product={product} onAdd={(item) => { updateQuantity(item.id, 1); setNotice(`${item.name} added to your request.`); }} />)}</div>}
            {quotations.length > 0 && <CustomerRequestList quotations={quotations.slice(0, 3)} formatDate={formatDate} onViewAll={() => navigate('requests')} />}
          </>}

          {page === 'catalogue' && <>
            <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> WAHAN PARTS & COMPONENTS</div><h1>Product catalogue</h1><p>Browse the available parts and add what you need to a quote request.</p></div><button className="button button-dark" onClick={() => setCartOpen(true)}><CustomerIcon name="cart" /> Request list <span className="button-count">{cartCount}</span></button></section>
            <section className="catalogue-toolbar"><div className="catalogue-search"><CustomerIcon name="search" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, part number, or keyword..." aria-label="Search catalogue" /></div><div className="filter-control"><CustomerIcon name="sliders" /><select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">{categories.map((item) => <option key={item}>{item}</option>)}</select></div></section>
            <div className="catalogue-result-line"><span><strong>{visibleProducts.length}</strong> parts found</span><span><i /> SAMPLE INVENTORY</span></div>
            {loading ? <div className="customer-loading">Loading catalogue…</div> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <PartCard key={product.id} product={product} onAdd={(item) => { updateQuantity(item.id, 1); setNotice(`${item.name} added to your request.`); }} />)}</div> : <EmptyPanel title="No matching parts" description="Try another search or choose a different category." icon="⌕" />}
          </>}

          {page === 'requests' && <>
            <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR QUOTATION HISTORY</div><h1>My requests</h1><p>View the quotation requests sent from your W-COM account.</p></div><span className="overview-date">{quotations.length} total requests</span></section>
            {quotations.length ? <CustomerRequestList quotations={quotations} formatDate={formatDate} /> : <div className="table-card"><EmptyPanel title="No requests yet" description="Explore the catalogue and send your first quotation request." icon="▤" /><div className="customer-empty-action"><button className="text-link" onClick={() => navigate('catalogue')}>Browse catalogue →</button></div></div>}
          </>}

          {page === 'profile' && <>
            <section className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> CUSTOMER ACCOUNT</div><h1>My details</h1><p>Keep your account and quotation contact details up to date.</p></div></section>
            <section className="table-card profile-editor">
              <div className="table-heading"><div><h2>Company and contact details</h2><p>Updates are saved to your customer account and used for future requests.</p></div><span className="table-total">PRIVATE ACCOUNT</span></div>
              <form className="profile-edit-form" onSubmit={saveProfile}><div className="form-grid">{profileFields.map((field) => <label className="form-field" key={field.id}><span>{field.label} <b>*</b></span><input required minLength={field.id === 'company' ? 2 : undefined} maxLength={field.maxLength || (field.id === 'company' ? 120 : 254)} type={field.type || 'text'} autoComplete={field.autocomplete} value={profileForm[field.id]} onChange={(event) => setProfileForm({ ...profileForm, [field.id]: field.id === 'gstNo' ? event.target.value.toUpperCase() : event.target.value })} placeholder={field.placeholder} /></label>)}</div><div className="profile-readonly-rep"><CustomerIcon name="people" /><span><small>ASSIGNED SALES REPRESENTATIVE</small><strong>{profile.salesRepresentative || 'To be assigned by Wahan'}</strong></span></div><button className="button button-primary" type="submit" disabled={profileSaving}>{profileSaving ? 'Saving…' : 'Save my details'} <CustomerIcon name="check" /></button></form>
            </section>
            <p className="profile-security-note">Changing your email also changes the email you use to sign in. Password changes will be added with the account security settings.</p>
          </>}
          <footer className="page-footer"><span>© 2025 Wahan Engineering Corporation</span><span><i /> YOUR CUSTOMER WORKSPACE</span></footer>
        </div>
      </main>

      {cartCount > 0 && !cartOpen && <button className="floating-cart" onClick={() => setCartOpen(true)}><CustomerIcon name="cart" /><span>Your request</span><b>{cartCount}</b></button>}
      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}><section className="side-drawer"><div className="drawer-head"><div><span className="drawer-kicker">YOUR SELECTION</span><h2>Request list <span>{cartCount}</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)}>×</button></div>{cartEntries.length ? <><div className="drawer-items">{cartEntries.map(({ product, quantity }) => <article className="drawer-product" key={product.id}><div className={`drawer-thumb part-art-${product.accent}`}>{partSymbols[product.icon] || '⚙'}</div><div className="drawer-product-info"><strong>{product.name}</strong><small>{product.partNumber} · {formatMoney(product.price)}</small><div className="quantity-stepper"><button onClick={() => updateQuantity(product.id, -1)} aria-label="Decrease quantity">−</button><span>{quantity}</span><button onClick={() => updateQuantity(product.id, 1)} aria-label="Increase quantity">+</button></div></div><strong className="drawer-line-total">{formatMoney(product.price * quantity)}</strong></article>)}</div><div className="drawer-total"><span>Estimated list value</span><strong>{formatMoney(cartTotal)}</strong><small>Final pricing will be confirmed by the Wahan team.</small></div><button className="button button-primary drawer-submit" onClick={() => { setProfileForm({ company: profile.company, gstNo: profile.gstNo, email: profile.email, phone: profile.phone }); setPaymentDays('0'); setRequestFormOpen(true); }}>Continue to request →</button><p className="drawer-privacy">Your customer details will be saved with this request.</p></> : <EmptyPanel title="Your request list is empty" description="Browse the catalogue and add parts to continue." icon="⌑" />}</section></div>}

      {requestFormOpen && <div className="overlay modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setRequestFormOpen(false); }}><form className="request-modal" onSubmit={submitRequest}><div className="drawer-head"><div><span className="drawer-kicker">QUOTATION REQUEST</span><h2>Confirm your details</h2></div><button type="button" className="icon-button" onClick={() => setRequestFormOpen(false)}>×</button></div><p className="modal-intro">Your details are saved with each request. Edit them here or update them later under My details.</p><div className="form-grid">{profileFields.map((field) => <label className="form-field" key={field.id}><span>{field.label} <b>*</b></span><input required minLength={field.id === 'company' ? 2 : undefined} maxLength={field.maxLength || (field.id === 'company' ? 120 : 254)} type={field.type || 'text'} value={profileForm[field.id]} onChange={(event) => setProfileForm({ ...profileForm, [field.id]: field.id === 'gstNo' ? event.target.value.toUpperCase() : event.target.value })} placeholder={field.placeholder} /></label>)}<label className="form-field form-field-full"><span>Payment terms <b>*</b></span><select value={paymentDays === '0' ? 'immediate' : 'days'} onChange={(event) => setPaymentDays(event.target.value === 'immediate' ? '0' : '30')}><option value="immediate">Immediate</option><option value="days">Custom number of days</option></select></label>{paymentDays !== '0' && <label className="form-field form-field-full"><span>Payment due in (days) <b>*</b></span><input required type="number" min="1" step="1" value={paymentDays} onChange={(event) => setPaymentDays(event.target.value)} /></label>}</div><div className="modal-summary"><span>{cartCount} parts in request</span><strong>{formatMoney(cartTotal)}</strong></div><button className="button button-primary modal-submit" type="submit" disabled={requestSaving}>{requestSaving ? 'Sending…' : 'Submit quotation request →'}</button></form></div>}
      {notice && <div className="toast" role="status"><span className="toast-check">✓</span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
    </div>
  );
}

function CustomerRequestList({ quotations, formatDate, onViewAll }) {
  return <section className="table-card customer-request-card"><div className="table-heading"><div><h2>Quotation requests</h2><p>Your requests, statuses, and payment terms.</p></div>{onViewAll && <button className="text-link" onClick={onViewAll}>View all →</button>}</div>{quotations.map((quotation) => <article className="customer-request-row" key={quotation.id}><div className="quote-reference"><span className="quote-doc">▤</span><span><strong>{quotation.reference}</strong><small>{formatDate(quotation.createdAt)}</small></span></div><div className="quote-part-count"><strong>{quotation.items.reduce((total, item) => total + item.quantity, 0)} parts</strong><small>{quotation.items.length} line items</small></div><div className="customer-quote-terms">{quotation.paymentDays === 0 ? 'Immediate payment' : `${quotation.paymentDays} days`}</div><div className="quote-amount">{formatMoney(quotation.total)}</div><CustomerStatus status={quotation.status} /></article>)}</section>;
}

function CustomerStatus({ status }) {
  const className = status.toLowerCase().replace(' ', '-');
  return <span className={`status-badge status-${className}`}><i /> {status}</span>;
}

function CustomerMetric({ label, value, note, icon }) {
  return <article className="metric-card"><div className="metric-topline"><span className="metric-icon metric-icon-green"><CustomerIcon name={icon} /></span><span className="metric-note">{note}</span></div><p className="metric-label">{label}</p><p className={`metric-value ${String(value).length > 15 ? 'metric-value-small' : ''}`}>{value}</p></article>;
}

function CustomerIcon({ name }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v8l9 5 9-5V8M12 13v8" /></>,
    quote: <><path d="M8 3h8l4 4v14H4V3h4Z" /><path d="M8 3v5h8V3M8 13h8M8 17h5" /></>,
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    sliders: <><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1.5" /><circle cx="15" cy="12" r="1.5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    cart: <><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /><path d="M2 3h2l2.6 12.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 8H5" /></>,
    logout: <><path d="M10 17l5-5-5-5m5 5H3m9-9h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1h-8" /></>,
    chevron: <path d="m9 18 6-6-6-6" />
  };
  return <svg className="customer-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.box}</svg>;
}
